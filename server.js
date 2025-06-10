import { config } from 'dotenv';
import express from 'express';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { 
  createPowerShellScript, 
  deleteScriptFile, 
  calculateJobStats, 
  analyzePatterns 
} from './utils.js';

config();
const app = express();
app.use(express.json());

// In production, this would be replaced with a proper database
const jobs = new Map();

const handleJobOutput = (jobId, data, isError = false) => {
  const logMethod = isError ? console.error : console.log;
  logMethod(`Job ${jobId} ${isError ? 'error' : 'output'}: ${data}`);
};

const updateJobStatus = (jobId, status, endTime = Date.now()) => {
  const currentJob = jobs.get(jobId);
  jobs.set(jobId, { ...currentJob, status, endTime });
};

const handleJobCompletion = (jobId, scriptPath, code, resolve) => {
  const status = code === 0 ? 'completed' : 'crashed';
  updateJobStatus(jobId, status);
  
  if (status === 'crashed' && jobs.get(jobId).retries < 1) {
    handleJobRetry(jobId, scriptPath, resolve);
  } else {
    deleteScriptFile(scriptPath);
    resolve();
  }
};

const handleJobRetry = (jobId, scriptPath, resolve) => {
  updateJobStatus(jobId, 'retried', null);
  jobs.set(jobId, { ...jobs.get(jobId), retries: 1 });
  
  const retryJob = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], { shell: true });
  
  retryJob.stdout.on('data', (data) => handleJobOutput(jobId, data));
  retryJob.stderr.on('data', (data) => handleJobOutput(jobId, data, true));
  
  retryJob.on('exit', (retryCode) => {
    const finalStatus = retryCode === 0 ? 'completed' : 'failed';
    updateJobStatus(jobId, finalStatus);
    deleteScriptFile(scriptPath);
    resolve();
  });
};

const simulateCppJob = async (jobName, args, jobId) => {
  const scriptPath = await createPowerShellScript(jobId);
  jobs.set(jobId, { jobName, args, status: 'running', startTime: Date.now(), retries: 0 });

  return new Promise((resolve) => {
    const job = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], { shell: true });
    
    job.stdout.on('data', (data) => handleJobOutput(jobId, data));
    job.stderr.on('data', (data) => handleJobOutput(jobId, data, true));
    
    job.on('exit', (code) => handleJobCompletion(jobId, scriptPath, code, resolve));
  });
};

app.post('/jobs', async (req, res) => {
  const { jobName, arguments: args } = req.body;
  if (!jobName || !Array.isArray(args)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  const jobId = uuidv4();
  simulateCppJob(jobName, args, jobId);
  res.status(201).json({ jobId, jobName, status: 'running' });
});

app.get('/jobs', (req, res) => {
  const jobList = Array.from(jobs.entries()).map(([id, job]) => ({
    jobId: id,
    jobName: job.jobName,
    args: job.args,
    status: job.status,
    startTime: job.startTime,
    endTime: job.endTime,
    retries: job.retries,
  }));
  res.json(jobList);
});

app.get('/stats', (req, res) => {
  const stats = calculateJobStats(jobs);
  const patterns = analyzePatterns(jobs, stats.overallSuccessRate);

  res.json({
    totalJobs: stats.totalJobs,
    failedJobs: stats.failedJobs,
    jobsWithRetries: stats.jobsWithRetries,
    jobsSucceededAfterRetry: stats.jobsSucceededAfterRetry,
    overallSuccessRate: (stats.overallSuccessRate * 100).toFixed(1) + '%',
    initialSuccessRate: (stats.initialSuccessRate * 100).toFixed(1) + '%',
    retrySuccessRate: stats.jobsWithRetries > 0 
      ? (stats.jobsSucceededAfterRetry / stats.jobsWithRetries * 100).toFixed(1) + '%' 
      : '0%',
    patterns,
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));