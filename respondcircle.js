const { spawn } = require('child_process');
// 监控轮询调度表达式
const nodeCronExpression = "*/1 * * * *";
const cron = require("node-cron");

async function spawnChild() {
    const child = spawn('trustee-tools', ["tx"]);

    let data = "";
    for await (const chunk of child.stdout) {
        console.log('stdout chunk: ' + chunk);
        data += chunk;
    }
    let error = "";
    for await (const chunk of child.stderr) {
        console.error('stderr chunk: ' + chunk);
        error += chunk;
    }
    const exitCode = await new Promise((resolve, reject) => {
        child.on('close', resolve);
    });

    if (exitCode) {
        throw new Error(`subprocess error exit ${exitCode}, ${error}`);
    }
    return data;
}

spawnChild()
