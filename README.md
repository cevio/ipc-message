# IPC Message

It is an interactive class based on the process communication between `master`, `Worker` and `Agent`.

# Install

```bash
npm install --save ipc-message
```

# Usage

```javascript
const IPCMessage = require('ipc-message');
module.exports = class NodeBase extends IPCMessage {
  constructor() {
    // If it is a `agent` type process, you need to set the parameter to `true`. 
    // super(true);
    super();

    // receive message from other processes.
    this.on('message', msg => {
      console.log(`[${this.type}] Receive Message:`, msg);
    });

    if (this.type === 'master') {
      // do master ...
    } else {
      // do worker
    }
  }
}
```

# Receive Message Event

We can receive messages from other processes through the event `message`.

```javascript
const IPCMessage = require('ipc-message');
module.exports = class NodeBase extends IPCMessage {
  constructor() {
    super();
    this.on('message', msg => {
      console.log(`[${this.type}] Receive Message:`, msg);
    });
  }
}
```

# Send Message Function

We send data through the `send` method.

```javascript
this.send(to, url, data);
```

Introduction of parameters:

- **to** `Array|String|Number` Which process to send data to: `master` `workers` `agents` `*` 
- **url** `String` Data identification
- **data** `*` data body

When we send data through the subprocess or the `Agent` process, the `master` process is transferred. For example, if we want to send the `Agent` process to the sub process, we will first send it to the `Agent` process through the `master` process, and vice versa.

# Regist Agent

```javascript
const agentWorkerRuntimeFile = path.resolve(__dirname, 'agent.js');
const agent = ChildProcess.fork(agentWorkerRuntimeFile, null, {
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
  stdin: process.stdin,
  stdio: process.stdio
});
this.registAgent('agent', agent);
```

**registAgent:(name, AgentObject)**

- **name** `String` The name of `Agent.
- **AgentObject** `Object` Agent object.

No matter how many `Agent` processes you open, you must use this method to register. This method will automatically bind the logic of sending and receiving messages from Agent.

# Test

You can see how to write through the examples in the test folder, and you can test the class by using the `npm run test` command.

## License

IPC Message is [MIT licensed](https://opensource.org/licenses/MIT).