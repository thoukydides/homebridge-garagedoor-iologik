// Hörmann Supramatic garage door opener plugin for Homebridge
// Copyright © 2019 Alexander Thoukydides

'use strict';

const UAP1 = require('./uap1');

let UUID;
let Service, Characteristic;

// Platform identifiers
const PLUGIN_NAME       = 'homebridge-garagedoor-iologik';
const ACCESSORY_NAME    = 'Garagedoor-ioLogik';

// Accessory defaults
const DEFAULT_NAME      = 'Garage Door';
const DEFAULT_HOST      = 'localhost';

// Hardcoded accessory information (hostname is used as serial number)
const INFO_MANUFACT     = 'Hörmann / Moxa';
const INFO_MODEL        = 'Supramatic / ioLogik E1214';
const INFO_FIRMWARE     = require('./package.json').version;

// Register as a provider of Garagedoor-ioLogik accessories
module.exports = homebridge => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME,
                                 GarageDoorOpenerAccessory);
}

// A Garagedoor-ioLogik accessory
class GarageDoorOpenerAccessory {

    // Constructor
    constructor(log, config) {
        this.log = log;

        // Extract the configuration, applying defaults where missing
        this.name    = config.name || DEFAULT_NAME;
        this.host    = config.host || DEFAULT_HOST;
        this.log('New ' + ACCESSORY_NAME + ' accessory on ' + this.host);

        // Create a UAP1 (Universal Adapter Print) interface
        this.uap1 = new UAP1(this.host, msg => log.debug(msg));
        this.uap1.on('door',  (...args) => this.updateDoorState(...args));
        this.uap1.on('light', (...args) => this.updateLightState(...args));
        this.uap1.on('error', e => this.log.warn(e.message));
        
        // Create the GarageDoorOpener service for this accessory
        this.doorService = new Service.GarageDoorOpener;
        this.doorService
            .getCharacteristic(Characteristic.TargetDoorState)
            .on('set', (...args) => this.setTargetDoorState(...args));
        this.updateDoorState('closed', 'closed');
        
        // Create the Lightbulb service for this accessory
        this.lightService = new Service.Lightbulb;
        this.lightService
            .getCharacteristic(Characteristic.On)
            .on('set', (...args)  => this.setLightOn(...args));
    }

    // Return a list of the accessory's services
    getServices () {
        // Create a temporary Information Service for this accessory
        let informationService = new Service.AccessoryInformation;
        informationService
            .setCharacteristic(Characteristic.Manufacturer,     INFO_MANUFACT)
            .setCharacteristic(Characteristic.Model,            INFO_MODEL)
            .setCharacteristic(Characteristic.SerialNumber,     this.host)
            .setCharacteristic(Characteristic.FirmwareRevision, INFO_FIRMWARE);
        
        // Return all services (Homebridge replaces the AccessoryInformation)
        return [informationService, this.doorService, this.lightService];
    }

    // Identify this accessory
    identify(callback) {
        this.log('Identify');
        callback();
    }

    // Set the target door state
    setTargetDoorState(value, callback, context) {
        let target = value == Characteristic.TargetDoorState.OPEN
                     ? 'open' : 'closed';
        this.log('Target door position ' + target.toUpperCase());
        this.uap1.setTargetDoorState(target, callback);
    }

    // Update the door state
    updateDoorState(current, target) {
        // Update the current door state
        this.log('Door is currently ' + current);
        const mapCurrent = {
            open:       Characteristic.CurrentDoorState.OPEN,
            closed:     Characteristic.CurrentDoorState.CLOSED,
            opening:    Characteristic.CurrentDoorState.OPENING,
            closing:    Characteristic.CurrentDoorState.CLOSING,
            stopped:    Characteristic.CurrentDoorState.STOPPED
        };
        this.doorService.updateCharacteristic(Characteristic.CurrentDoorState,
                                              mapCurrent[current]);

        // Update the target door state
        this.log('Target door position is ' + target);
        const mapTarget = {
            open:       Characteristic.TargetDoorState.OPEN,
            closed:     Characteristic.TargetDoorState.CLOSED
        };
        this.doorService.updateCharacteristic(Characteristic.TargetDoorState,
                                              mapTarget[target]);
    }
    
    // Set the light state
    setLightOn(value, callback, context) {
        this.log('Switch light ' + (value ? 'ON' : 'OFF'));
        this.uap1.setLightOn(value, callback);
    }

    // Update the light state
    updateLightState(on) {
        this.log('Light: ' + (on ? 'on' : 'off'));
        this.lightService.updateCharacteristic(Characteristic.On, on);
    }
}
