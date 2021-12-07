'use strict';

const rpio = require('rpio');

var Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-simple-garage-door-opener', 'SimpleGarageDoorOpener', SimpleGarageDoorOpener);
};

class SimpleGarageDoorOpener {
  constructor (log, config) {

    //get config values
    this.name = config['name'];
    this.doorSwitchPin = config['doorSwitchPin'] || 3;
    this.doorSwitchPinClose = config['doorSwitchPinClose'] || 7;
    this.doorSwitchPinLed = config['doorSwitchPinLed'] || 10;
    this.simulateTimeOpening = config['simulateTimeOpening'] || 28;
    this.simulateTimeOpen = config['simulateTimeOpen'] || 20;
    this.simulateTimeClosing = config['simulateTimeClosing'] || 28;

    //initial setup
    this.log = log;
    this.lastOpened = new Date();
    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.setupGarageDoorOpenerService(this.service);

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Metadata')
      .setCharacteristic(Characteristic.Model, 'Gate Opener')
      .setCharacteristic(Characteristic.SerialNumber, '3331');
  }

  getServices () {
    return [this.informationService, this.service];
  }

  setupGarageDoorOpenerService (service) {
    rpio.open(this.doorSwitchPin, rpio.OUTPUT, rpio.HIGH);
    rpio.open(this.doorSwitchPinLed, rpio.OUTPUT, rpio.HIGH);
    rpio.open(this.doorSwitchPinClose, rpio.OUTPUT, rpio.HIGH);

    this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', (callback) => {
        var targetDoorState = service.getCharacteristic(Characteristic.TargetDoorState).value;
        if (targetDoorState === Characteristic.TargetDoorState.OPEN && ((new Date() - this.lastOpened) >= (this.closeAfter * 1000))) {
          this.log('Setting TargetDoorState -> CLOSED');
          callback(null, Characteristic.TargetDoorState.CLOSED);
        } else {
          callback(null, targetDoorState);
        }
      })
      .on('set', (value, callback) => {
          this.lastOpened = new Date();
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
              if (value === Characteristic.TargetDoorState.OPEN) {
                  this.lastOpened = new Date();
                  this.openGarageDoor(callback);
                  this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
                    setTimeout(() => {
                      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
                    }, this.simulateTimeOpening * 1000);
                } else {
                callback();
              }
              break;
            case Characteristic.CurrentDoorState.CLOSING:
              this.openGarageDoor(callback);
              this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
              setTimeout(() => {
                  this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
                }, this.simulateTimeOpening * 1000);
              break;
            case Characteristic.CurrentDoorState.OPEN:
              if (value === Characteristic.TargetDoorState.CLOSED) {
                  this.lastOpened = new Date();
                  this.closeGarageDoor(callback);
                  this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
                    setTimeout(() => {
                      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
                  }, this.simulateTimeClosing * 1000);
                } else {
                callback();
              }
              break;
            case Characteristic.CurrentDoorState.OPENING:
              this.closeGarageDoor(callback);
              this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
              setTimeout(() => {
                  this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
                }, this.simulateTimeClosing * 1000);
              break;
            default:
            this.closeGarageDoor(callback);
            this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
              callback();
          }
      });
  }

  openGarageDoor (callback) {
    //otvor pin Open
    rpio.write(this.doorSwitchPin, rpio.LOW);

    /* UZ NEBLIKAM TU ALE CEZ HOMEKIT AUTOMATIZACIE, LEDKA PRIDANA AKO HOMEKIT ZIAROVKA
    //flashni pin LED
    rpio.write(this.doorSwitchPinLed, rpio.LOW);
    rpio.sleep(0.2);
    rpio.write(this.doorSwitchPinLed, rpio.HIGH);
    rpio.sleep(0.2);
    //otvor pin LED
    rpio.write(this.doorSwitchPinLed, rpio.LOW);
    UZ NEBLIKAM TU ALE CEZ HOMEKIT AUTOMATIZACIE, LEDKA PRIDANA AKO HOMEKIT ZIAROVKA */

    //casovac na auto close - zavri pin Open a LED (LED flasne)
    setTimeout(() => {
      if(this.service.getCharacteristic(Characteristic.CurrentDoorState).value === Characteristic.CurrentDoorState.OPEN){
          /* UZ NEBLIKAM TU ALE CEZ HOMEKIT AUTOMATIZACIE, LEDKA PRIDANA AKO HOMEKIT ZIAROVKA
          rpio.write(this.doorSwitchPinLed, rpio.HIGH);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.LOW);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.HIGH);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.LOW);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.HIGH)
          UZ NEBLIKAM TU ALE CEZ HOMEKIT AUTOMATIZACIE, LEDKA PRIDANA AKO HOMEKIT ZIAROVKA */

          rpio.write(this.doorSwitchPin, rpio.HIGH);
          this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
          this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
          callback();
      }
          
          /*
          rpio.write(this.doorSwitchPin, rpio.HIGH);
          rpio.write(this.doorSwitchPinLed, rpio.HIGH);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.LOW);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.HIGH);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.LOW);
          rpio.sleep(0.2);
          rpio.write(this.doorSwitchPinLed, rpio.HIGH);*/
    }, (this.simulateTimeOpen + this.simulateTimeOpening) * 1000);

    this.log('Opening the garage door for...');
    //this.simulateGarageDoorOpening();
    callback();
  }
  closeGarageDoor (callback) {
    //zavri pin Open
    rpio.write(this.doorSwitchPin, rpio.HIGH);

    /* UZ NEBLIKAM TU ALE CEZ HOMEKIT AUTOMATIZACIE, LEDKA PRIDANA AKO HOMEKIT ZIAROVKA
    //flashni pin LED
    rpio.write(this.doorSwitchPinLed, rpio.HIGH);
    rpio.sleep(0.2);
    rpio.write(this.doorSwitchPinLed, rpio.LOW);
    rpio.sleep(0.2);
    rpio.write(this.doorSwitchPinLed, rpio.HIGH);
    rpio.sleep(0.2);
    rpio.write(this.doorSwitchPinLed, rpio.LOW);
    rpio.sleep(0.2);
    //zavri pin LED
    rpio.write(this.doorSwitchPinLed, rpio.HIGH);
    UZ NEBLIKAM TU ALE CEZ HOMEKIT AUTOMATIZACIE, LEDKA PRIDANA AKO HOMEKIT ZIAROVKA */


    //otvor a zavri pin Close - brana dojde sama
    rpio.write(this.doorSwitchPinClose, rpio.LOW);
    rpio.sleep(0.5);
    rpio.write(this.doorSwitchPinClose, rpio.HIGH);

    this.log('Closing the garage door for...');
    //this.simulateGarageDoorOpening();
    callback();
  }

  simulateGarageDoorOpening () {
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
    setTimeout(() => {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
      setTimeout(() => {
        this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
        this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
        setTimeout(() => {
          this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
        }, this.simulateTimeClosing * 1000);
      }, this.simulateTimeOpen * 1000);
    }, this.simulateTimeOpening * 1000);
  }
}
