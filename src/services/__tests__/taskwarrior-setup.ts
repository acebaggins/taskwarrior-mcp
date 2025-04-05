import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const testDir = join(projectRoot, '.task-test');
const testDataDir = join(testDir, 'data');
const testConfigFile = join(testDir, '.taskrc');

if (!existsSync(testDir)) {
  mkdirSync(testDir, { recursive: true });
}

if (!existsSync(testDataDir)) {
  mkdirSync(testDataDir, { recursive: true });
}

if (!existsSync(testConfigFile)) {
  const taskRcContent = `# Test Taskwarrior Configuration
data.location=${testDataDir}
verbose=new-uuid
rc.dateformat=Y-M-DTH:N
`;
  writeFileSync(testConfigFile, taskRcContent, 'utf8');
}

try {
  execSync('task --version', { 
    env: {
      ...process.env,
      TASKDATA: testDataDir,
      TASKRC: testConfigFile
    }
  });
} catch (error) {
  console.error('Failed to initialize test Taskwarrior instance');
  console.error(error);
}

export const taskTestConfig = {
  taskData: testDataDir,
  taskRc: testConfigFile
};