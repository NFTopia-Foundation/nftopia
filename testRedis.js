"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ioredis_1 = require("ioredis");
var client = new ioredis_1.default();
client.set('hello', 'world').then(function () {
    console.log('Set successful');
    client.quit();
});
