const cluster = require('cluster');
const EventEmitter = require('async-events-listener');
const addMessageListener = Symbol('IPCMessage#addMessageListener');
const removeMessageListener = Symbol('IPCMessage#removeMessageListener');
const collectWorkers = Symbol('IPCMessage#collectWorkers');
const sending = Symbol('IPCMessage#sending');
const onMessage = Symbol('IPCMessage#onMessage');

module.exports = class IPCMessager extends EventEmitter {
  constructor(isAgent) {
    super();
    this.pid = process.pid;
    this.type = isAgent 
      ? 'agent' 
      : (
        cluster.isMaster 
          ? 'master' 
          : (
            cluster.isWorker 
            ? 'worker' 
            : 'agent'
          )
        );
    this[addMessageListener](process);

    if (this.type === 'master') {
      this.workers = [];
      this.agents = {};

      cluster.on('fork', worker => {
        this.workers.push(worker);
        this[addMessageListener](worker);
      });

      cluster.on('exit', worker => {
        const index = this.workers.indexOf(worker);
        if (index > -1) this.workers.splice(index, 1);
        this[removeMessageListener](worker);
      });
    }
  }

  registAgent(name, agent) {
    if (this.type === 'master') {
      this.agents[name] = agent;
      this[addMessageListener](agent);
    }
    return this;
  }

  send(to, action, body, socket) {
    if (!Array.isArray(to)) to = [to];
    if (this.type === 'master') {
      const workers = this[collectWorkers](to, this.pid);
      return this[sending](workers, {
        action, body,
        from: this.pid,
        to: workers.map(p => (p.process || p).pid)
      }, socket);
    }
    process.send({
      to, action, body,
      transfer: true,
      from: this.pid
    }, socket);
    return this;
  }

  [addMessageListener](child) {
    child.on('message', this[onMessage].bind(this));
    return this;
  }

  [removeMessageListener](child) {
    child.removeAllListeners();
    return this;
  }

  [collectWorkers](pids, excludePid = 0) {
    const pools = [];
    for (let i = 0; i < pids.length; i++) {
      if (typeof pids[i] === 'string') {
        switch (pids[i]) {
          case 'master':
            pools.push(process);
            break;
          case 'agents':
            pools.push(...Object.values(this.agents));
            break;
          case 'workers':
            pools.push(...this.workers);
            break;
          case '*':
            pools.push(process);
            pools.push(...this.workers);
            pools.push(...Object.values(this.agents));
            break;
          default:
            if (this.agents[pids[i]]) {
              pools.push(this.agents[pids[i]]);
            }
        }
      } else {
        const agents = Object.values(this.agents).filter(ag => ag.pid === pids[i]);
        const workers = this.workers.filter(worker => worker.process.pid === pids[i]);
        if (workers.length) pools.push(...workers);
        if (agents.length) pools.push(...agents);
      }
    }

    return Array.from(new Set(pools)).filter(worker => (worker.process || worker).pid !== excludePid);
  }

  /**
   * Receive message Object
   * @param {Object} msg 
   * @param to {Array|string} accept process ids
   * @param transfer {Boolean} 是否需要中转
   * @param from {Number} pid
   * @param url {String} 
   * @param body {*}
   */
  async [onMessage](msg, socket) {
    if (typeof msg === 'string') {
      return await this.emit(msg, socket);
    }

    if (this.type === 'master') {
      const pools = this[collectWorkers](msg.to, msg.from);
      const index = pools.indexOf(process);
      if (pools.indexOf(process) > -1) {
        pools.splice(index, 1);
        await this.emit('message', msg, socket);
      }
      if (msg.transfer && pools.length) {
        msg.to = pools.map(p => (p.process || p).pid);
        this[sending](pools, msg, socket);
      }
    } else {
      if (msg.to.indexOf(this.pid) > -1) {
        await this.emit('message', msg, socket);
      }
    }
  }

  [sending](to, msg, socket) {
    for (let i = 0; i < to.length; i++) {
      to[i].send(msg, socket);
    }
    return this;
  }
}