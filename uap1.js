// Hörmann Supramatic garage door opener plugin for Homebridge
// Copyright © 2019 Alexander Thoukydides

'use strict';

const IoLogik = require('./iologik');
const EventEmitter = require('events');

// DI channels
const DI = {
    open:       0,      // Indicates that the door is fully closed
    closed:     1       // Indicates that the door is fully open
};

// DO relay channels
const DO = {
    open:       2,      // Toggle opening the door
    partial:    3,      // Toggle partially opening the door
    close:      4,      // Toggle closing the door
    light:      5       // Toggle the light
};

// Timings (seconds)
const TIME = {
    poll:       1,      // Interval between successive polls of door position
    move:       25,     // Time required to fully open or fully close
    light_ext:  900,    // Illumination time via radio/external button
    light_move: 300     // Illumination switch-off delay after movement stops
};
const MS = 1000;

// UAP1 (Universal Adapter Print) interface for Hörmann Supramatic
module.exports = class UAP1 extends EventEmitter {

    // Create a new UAP1 object
    constructor(host, log) {
        super();
        this.log = log || console.log;
        
        // Construct an ioLogik API
        this.host = host;
        this.iologik = new IoLogik(host, log);

        // Read and log the ioLogic system information
        this.logDeviceInfo();

        // Start polling the door state
        this.currentState = 'closed';
        this.targetState = 'closed';
        this.pollDoorPosition();

        // Assume that the light is initially off
        this.lightState = false;
    }
    
    // Read and log device information
    async logDeviceInfo() {
        try {
            let sysinfo = await this.iologik.getSysInfo();
            for (let key in sysinfo) {
                this.log(key + ': ' + sysinfo[key]);
            }
        } catch (e) {
            this.emit('error', e);
        }
    }

    // Poll for the garage door position
    async pollDoorPosition() {
        try {
            let di = await this.iologik.getDI();
            this.updateDoorPosition(di[DI.closed] ? 'closed'
                                    : (di[DI.open] ? 'open' : 'unknown'));
        } catch (e) {
            this.emit('error', e);
        }
        setTimeout(() => this.pollDoorPosition(), TIME.poll * MS);
    }

    // Set the target door state
    async setTargetDoorState(value, callback) {
        const action = {
            open:   { state: 'opening', relay: DO.open },
            closed: { state: 'closing', relay: DO.close }
        }[value];
        if (this.currentState == value || this.currentState == action.state) {
            this.log('Door is already ' + this.currentState);
        } else {
            // Start opening or closing the door
            try {
                await this.pulseRelay(action.relay);
            } catch (e) {
                this.emit('error', e);
                return callback(e);
            }

            // Update the door state to match
            this.updateDoorPosition(action.state);
        }
        callback();
    }

    // The door position has been updated
    updateDoorPosition(state) {
        // Apply the new door state
        let currentState = this.currentState;
        if ((state == 'open'    && currentState != 'closing') ||
            (state == 'opening' && currentState != 'open')    ||
            (state == 'closing' && currentState != 'closed')  ||
            (state == 'closed'  && currentState != 'opening') ||
            (state == 'stopped')) {
            // State is well defined, and not start or stop of motion
            currentState = state;
        } else if (state == 'unknown') {
            // Door not fully open or closed, so check for start of motion
            if      (currentState == 'open')   currentState = 'closing';
            else if (currentState == 'closed') currentState = 'opening';
        }

        // No further action required unless the current door state has changed
        if (this.currentState == currentState) return;

        // The door will only continue moving for a short period
        clearTimeout(this.moveTimeout);
        if (currentState == 'opening' || currentState == 'closing') {
            this.moveTimeout = setTimeout(() => {
                this.updateDoorPosition('stopped');
            }, TIME.move * MS);
        }

        // Update the target state based on the new door state
        if (currentState == 'open' || currentState == 'opening') {
            this.targetState = 'open';
        } else if (currentState == 'closed' || currentState == 'closing') {
            this.targetState = 'closed';
        }

        // The light will have been switched on with the door movement
        this.updateLightState(true, TIME.light_move);

        // Emit a notification
        this.currentState = currentState;
        this.emit('door', currentState, this.targetState);
    }
    
    // Switch the light on or off
    async setLightOn(value, callback) {
        if (this.lightState == value) {
            this.log('Light is already in the requested state');
        } else {
            // Toggle the light on/off
            try {
                await this.pulseRelay(DO.light);
            } catch (e) {
                this.emit('error', e);
                return callback(e);
            }

            // Update the expected state of the light
            this.updateLightState(value, value ? TIME.light_ext : 0);
        }
        callback();
    }

    // The light has been switched on
    updateLightState(state, duration) {
        if (this.lightState != state) {
            // The state of the light has changed
            this.lightState = state;
            this.emit('light', state);
        }
        
        // The light will switch off after a delay
        clearTimeout(this.lightTimeout);
        if (duration) {
            this.lightTimeout = setTimeout(() => {
                this.log('Light switched off after ' + duration + ' seconds');
                this.updateLightState(false);
            }, duration * MS);
        }
    }

    // Pulse an ioLogik relay
    async pulseRelay(index) {
        this.log('Pulsing ioLogik relay #' + index);
        return this.iologik.pulseDO(index);
    }
}
