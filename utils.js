import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const getBatchDirectory = () => {
  return process.env.BATCH_DIR || path.join(__dirname, 'batch');
};

export const createPowerShellScript = async (jobId) => {
  const batDir = getBatchDirectory();
  await fs.mkdir(batDir, { recursive: true });
  const scriptPath = path.join(batDir, `simulate_job_${jobId}.ps1`);
  await fs.writeFile(scriptPath, `$rand = Get-Random -Minimum 0 -Maximum 32768\nif ($rand -lt 16384) { exit 1 } else { exit 0 }`);
  return scriptPath;
};

export const deleteScriptFile = (scriptPath) => {
  setTimeout(() => {
    fs.unlink(scriptPath).catch((err) => console.error(`Error deleting file ${scriptPath}:`, err));
  }, 1000);
};

export const calculateJobStats = (jobs) => {
  const totalJobs = jobs.size;
  const completedJobs = Array.from(jobs.values()).filter((job) => job.status === 'completed').length;
  const failedJobs = Array.from(jobs.values()).filter((job) => job.status === 'failed').length;
  const jobsWithRetries = Array.from(jobs.values()).filter((job) => job.retries > 0).length;
  const jobsSucceededAfterRetry = Array.from(jobs.values()).filter((job) => job.retries > 0 && job.status === 'completed').length;
  
  const overallSuccessRate = totalJobs > 0 ? completedJobs / totalJobs : 0;
  const initialSuccessRate = totalJobs > 0 ? (completedJobs - jobsSucceededAfterRetry) / totalJobs : 0;

  return {
    totalJobs,
    failedJobs,
    jobsWithRetries,
    jobsSucceededAfterRetry,
    overallSuccessRate,
    initialSuccessRate
  };
};

export const analyzePatterns = (jobs, overallSuccessRate) => {
  const patterns = [
    {
      pattern: 'Submitted in evening (18:00–24:00)',
      matchCount: 0,
      successCount: 0,
      retryCount: 0,
      successAfterRetryCount: 0
    },
    {
      pattern: 'Has 10 or more arguments',
      matchCount: 0,
      successCount: 0,
      retryCount: 0,
      successAfterRetryCount: 0
    },
    {
      pattern: 'Job was retried',
      matchCount: 0,
      successCount: 0,
      retryCount: 0,
      successAfterRetryCount: 0
    },
  ];

  jobs.forEach((job) => {
    const hour = new Date(job.startTime).getHours();
    if (hour >= 18 && hour < 24) {
      patterns[0].matchCount++;
      if (job.status === 'completed') {
        patterns[0].successCount++;
        if (job.retries > 0) patterns[0].successAfterRetryCount++;
      }
      if (job.retries > 0) patterns[0].retryCount++;
    }

    if (job.args.length > 9) {
      patterns[1].matchCount++;
      if (job.status === 'completed') {
        patterns[1].successCount++;
        if (job.retries > 0) patterns[1].successAfterRetryCount++;
      }
      if (job.retries > 0) patterns[1].retryCount++;
    }

    if (job.retries > 0) {
      patterns[2].matchCount++;
      if (job.status === 'completed') {
        patterns[2].successCount++;
        patterns[2].successAfterRetryCount++;
      }
      patterns[2].retryCount++;
    }
  });

  return patterns.map((p) => ({
    pattern: p.pattern,
    matchCount: p.matchCount,
    initialSuccessRate: p.matchCount > 0 ? ((p.successCount - p.successAfterRetryCount) / p.matchCount * 100).toFixed(1) + '%' : '0%',
    finalSuccessRate: p.matchCount > 0 ? (p.successCount / p.matchCount * 100).toFixed(1) + '%' : '0%',
    retrySuccessRate: p.retryCount > 0 ? (p.successAfterRetryCount / p.retryCount * 100).toFixed(1) + '%' : '0%',
    differenceFromAverage: p.matchCount > 0
      ? ((p.successCount / p.matchCount - overallSuccessRate) * 100).toFixed(1) + '%'
      : '0%',
  }));
}; 