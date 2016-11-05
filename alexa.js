/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.export = function(RED) {
    "use strict";
    var request = require('request');
    var mqtt = require('mqtt');
    var bodyParser = require('body-parser');

    var devices = {};

    function conf(n) {
    	RED.nodes.createNode(this,n);
    	this.username = this.credentials.username;
    	this.password = this.credentials.password;

    	var node = this;

    	this.on('close',function(){
    		delete devices[username];
    	});
    }

    RED.registerType("alexa-home-conf",conf,{
    	credentials: {
    		username: {type: "text"},
    		password: {type: "password"}
    	}
    });

    function alexaHome(n) {
    	RED.nodes.createNode(this,n);
    	this.conf = RED.nodes.getNode(n.conf);
    	this.device = n.device;

    	var node = this;

    }

    RED.registerType("alexa-home",alexaHome);

    RED.httpAdmin.use('/alexa-home/new-account',bodyParser.json());

    RED.httpAdmin.post('/alexa-home/new-account',function(req,res){
    	console.log(req.body);
    	// request.get({
    	// 	url: 'https://alexa-node-red.eu-gb.mybluemix.net/api/v1/devices',
    	// 	auth: {
    	// 		username: node.username,
    	// 		password: node.password
    	// 	}
    	// }, function(err, res, body){
    	// 	if (!err) {
    	// 		devs = JSON.parse(body);
    	// 		console.log(devs);
    	// 		devices[node.username] = devs;
    	// 	}
    	// });
    });

    RED.httpAdmin.get('/alexa-home/devices/:id',function(req,res){
    	if (devices[req.params.id]) {
    		res.send(devices[req.params.id]);
    	} else {
    		res.status(404).send();
    	}
    });
};