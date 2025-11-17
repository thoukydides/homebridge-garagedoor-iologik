# homebridge-garagedoor-iologik

[![npm](https://img.shields.io/npm/v/homebridge-garagedoor-iologik?label=Latest)](https://www.npmjs.com/package/homebridge-garagedoor-iologik)
[![npm](https://img.shields.io/npm/dt/homebridge-garagedoor-iologik?logo=npm&label=Downloads)](https://www.npmjs.com/package/homebridge-garagedoor-iologik)
[![npm](https://img.shields.io/npm/dw/homebridge-garagedoor-iologik?label=)](https://www.npmjs.com/package/homebridge-garagedoor-iologik)

Hörmann Supramatic garage door opener plugin for [Homebridge](https://github.com/nfarina/homebridge).

Hörmann and Supramatic are trademarks owned by [Hörmann KG Verkaufsgesellschaft](https://www.hoermann.com/).

Moxa and ioLogik are trademarks owned by [Moxa Inc](https://www.moxa.com/).

This plugin was developed for a [Hörmann Supramatic](https://www.hormann.co.uk/home-owners-and-renovators/operators/garage-door-operators/) garage door opener connected via a UAP1 (Universal Adapter Print) and a [Moxa ioLogik E1214](https://www.moxa.com/en/products/industrial-edge-connectivity/controllers-and-ios/universal-controllers-and-i-os/iologik-e1200-series/iologik-e1214) remote Ethernet I/O server.

## Installation

1. Connect and configure the UAP1 and ioLogik E1214 (see wiring and configuration guide below).
1. Install this plugin using: `npm install -g homebridge-garagedoor-iologik`
1. Edit `config.json` and add a Garagedoor-ioLogik accessory for each garage door to be controlled (see example below).
1. Run [Homebridge](https://github.com/nfarina/homebridge).

### Wiring

The Supramatic provides 24V DC power to the ioLogik E1214 via the UAP1. The **power terminal block** on the top panel of the ioLogik E1214 should be connected to the main terminal block in the UAP1 as follows:

| ioLogik E1214 | UAP1    | Description                         |
| ------------- | ------- | ------------------------------      |
| V+            | 5 (24V) | Power supply for ioLogik E1214      |
| V-            | 20 (0V) | Power supply for ioLogik E1214      |
| GND           |         | Ground not connected to UAP1        |

The ioLogik E1214 main **I/O channels terminal block** is wired to the UAP1 as follows:

| ioLogik E1214 | UAP1    | Description                         |
| ------------- | ------- | ------------------------------      |
| COM           | 5 (24V) | Common for DI channels              |
| DI0           | K01.8   | DI-00 input: Door open              |
| DI1           | K02.8   | DI-01 input: Door closed            |
| DI2           | -       | *(not connected)*                   |
| DI3           | -       | *(not connected)*                   |
| DI4           | -       | *(not connected)*                   |
| DI5           | -       | *(not connected)*                   |
| GND           | 20 (0V) | Ground for DI channels              |
| R0_NO         | -       | *(not connected)*                   |
| R0_C          | -       | *(not connected)*                   |
| R1_NO         | -       | *(not connected)*                   |
| R1_C          | -       | *(not connected)*                   |
| R2_NO         | 15 (S2) | DO-02 relay output: Go open         |
| R2_C          | 20 (0V) | DO-02 relay common: Go open         |
| R3_NO         | 23 (S3) | DO-02 relay output: Go partial open |
| R3_C          | 20 (0V) | DO-02 relay common: Go partial open |
| R4_NO         | 17 (S4) | DO-02 relay output: Go close        |
| R4_C          | 20 (0V) | DO-02 relay common: Go close        |
| R5_NO         | 10 (S5) | DO-02 relay output: Toggle light    |
| R5_C          | 20 (0V) | DO-02 relay common: Toggle light    |

The DI channels are connected to the UAP1 relays as dry contacts. The DO channels connect the UAP1 inputs to 0V when the relays are activated.

### ioLogik Configuration

The ioLogik E1214 must be running firmware version 2.5 or later to support RESTful API. Ensure that the **Enable Resful API** option is enabled.

The **DI channels** should be configured as follows:

| DI Channel | Mode | Filter | Alias of Channel | Alias of OFF Status | Alias of ON Status |
| ---------- | ---- | ------ | ---------------- | ------------------- | ------------------ |
| DI-00      | DI   | 100ms  | Door is open     | Not open            | Open               |
| DI-01      | DI   | 100ms  | Door is closed   | Not closed          | Closed             |
| DI-02      | DI   | 100ms  | ~~DI~~           | ~~OFF~~             | ~~ON~~             |
| DI-03      | DI   | 100ms  | ~~DI~~           | ~~OFF~~             | ~~ON~~             |
| DI-04      | DI   | 100ms  | ~~DI~~           | ~~OFF~~             | ~~ON~~             |
| DI-05      | DI   | 100ms  | ~~DI~~           | ~~OFF~~             | ~~ON~~             |

The **DO channels** should be configured as follows:

| DO Channel | Mode         | OFF Width | ON Width | Pulse Count | Alias of Channel | Alias of OFF Status | Alias of ON Status |
| ---------- | ------------ | --------- | -------- | ----------- | ---------------- | ------------------- | ------------------ |
| DO-00      | DO           |           |          |             | ~~DO~~           | ~~OFF~~             | ~~ON~~             |
| DO-01      | DO           |           |          |             | ~~DO~~           | ~~OFF~~             | ~~ON~~             |
| DO-02      | Pulse Output | 1 (1.5s)  | 1 (1.5s) | 1           | Open             | Idle                | Go open            |
| DO-03      | Pulse Output | 1 (1.5s)  | 1 (1.5s) | 1           | Partial open     | Idle                | Go partial open    |
| DO-04      | Pulse Output | 1 (1.5s)  | 1 (1.5s) | 1           | Close            | Idle                | Go close           |
| DO-05      | Pulse Output | 1 (1.5s)  | 1 (1.5s) | 1           | Light            | Idle                | Toggle light       |

### Example `config.json`
```JSON
{
    "accessories":
    [{
        "accessory":    "Garagedoor-ioLogik",
        "name":         "Bunker Door",
        "host":         "iologik-e1214"
    }]
}
```
Multiple accessories can be added to control different garage doors. They must be each given a unique name.

The `host` specifies how to reach the ioLogik E1214.

## Notes

The following (non-default) timings are hardcoded in the plugin:

| MENU 2 | Switch-off delay | Description                                 |
| ------ | ---------------- | ------------------------------------------- |
| 5      | 5 minutes        | Illumination during and after door movement |
| 9      | 15 minutes       | Switched via radio/external button          |

## License

> ISC License (ISC)<br>Copyright © 2019 Alexander Thoukydides
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
