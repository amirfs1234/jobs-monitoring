import axios from 'axios';

const sendJobRequest = async (jobName, args) => {
  try {
    const response = await axios.post('http://localhost:3000/jobs', {
      jobName,
      arguments: args,
    });
    console.log(`Started job ${jobName}:`, response.data);
  } catch (error) {
    console.error(`Error starting job ${jobName}:`, error.message);
  }
};

const generateRandomArgs = (jobNumber) => {
  const numArgs = Math.floor(Math.random() * 15) + 1; // Random number between 1 and 15
  return Array.from({ length: numArgs }, (_, i) => `arg${jobNumber}${String.fromCharCode(97 + i)}`);
};

const runConcurrentJobs = async (numJobs) => {
  const jobPromises = [];
  for (let i = 1; i <= numJobs; i++) {
    const jobName = `test-job-${i}`;
    const args = generateRandomArgs(i);
    jobPromises.push(sendJobRequest(jobName, args));
  }
  await Promise.all(jobPromises);
  console.log(`${numJobs} jobs started concurrently`);
};

runConcurrentJobs(10);