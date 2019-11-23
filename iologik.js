// Hörmann Supramatic garage door opener plugin for Homebridge
// Copyright © 2019 Alexander Thoukydides

'use strict';

const request = require('request-promise-native');

// RESTful API for a Moxa ioLogik E1214 Remote Ethernet I/O Server
module.exports = class IoLogik {

    // Create a new API object
    constructor(host, log) {
        // Default to console logging
        this.log = log || console.log;
        
        // Store the hostname or IP address
        this.host = host;
    }

    // Get device and network information
    async getSysInfo() {
        let response = await this.get('/api/slot/0/sysInfo');
        return Object.assign({}, response.sysInfo.device[0],
                                 response.sysInfo.network.LAN);
    }

    // Get status of all DI channels
    async getDI() {
        let response = await this.get('/api/slot/0/io/di');
        let channels = [];
        response.io.di.forEach(i => { channels[i.diIndex] = i.diStatus; });
        return channels;
    }

    // Get status of all DO relay channels
    async getDO() {
        let response = await this.get('/api/slot/0/io/relay');
        let channels = [];
        response.io.relay.forEach(i => {
            channels[i.relayIndex] = i.relayMode ? i.relayPulseStatus
                                                 : i.relayStatus;
        });
        return channels;
    }

    // Pulse a single DO relay channel
    async pulseDO(index) {
        let request = {
            slot: 0,
            io: {
                relay: {
                    [index]: { "relayPulseStatus": 1 }
                }
            }
        };
        let response = await this.put('/api/slot/0/io/relay/' + index + '/relayPulseStatus', request);
    }

    // Issue a raw GET request
    get(path) {
        this.log('GET ' + this.host + path);
        return request({
            url:        'http://' + this.host + path,
            headers:    { 'Accept': 'vdn.dac.v1' },
            json:       true
        });
    }

    // Issue a raw POST request
    put(path, body) {
        this.log('PUT ' + this.host + path);
        let jsonData = JSON.stringify(body);
        return request({
            method:     'PUT',
            url:        'http://' + this.host + path,
            headers:    {
                'Accept':           'vdn.dac.v1',
                'Content-Type':     'application/json',
                'Content-Length':   Buffer.byteLength(jsonData)
            },
            body:       jsonData
        });
    }
}
