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

module.exports = function(RED) {

    "use strict";
    var request = require('request');
    var mqtt = require('mqtt');
    var bodyParser = require('body-parser');

    var devices = {};

    function alexaConf(n) {
    	RED.nodes.createNode(this,n);
    	this.username = n.username;
    	this.password = this.credentials.password;

    	var node = this;

        var options = {
            username: node.username,
            password: node.password
        };

        getDevices(node.username, node.password, node.id);

        node.client = mqtt.connect('mqtt://alexa-node-red.hardill.me.uk', options);

        node.client.on('connect', function() {
            node.emit('status',{text:'connected', shape:'dot', fill:'green'});
            node.client.subscribe(node.username + '/#');
        });

        node.client.on('offline',function(){
            node.emit('status',{text: 'disconnected', shape: 'dot', fill:'red'});
        });

        node.client.on('reconnect', function(){
            node.emit('status',{text: 'reconnecting', shape: 'ring', fill:'red'});
        });

        node.client.on('message', function(topic, message){
            // console.log(topic);
            // console.log(message.toString());
            var msg = JSON.parse(message.toString()); 
            node.emit('alexa'+msg.payload.appliance.applianceId, msg);
        });

    	this.on('close',function(){
            node.client.end();
            //node.removeAllListeners();
    		delete devices[node.id];
    	});
    };

    RED.nodes.registerType("alexa-home-conf",alexaConf,{
        credentials: {
            password: {type:"password"}
        }
    });

    function alexaHome(n) {
    	RED.nodes.createNode(this,n);
    	this.conf = RED.nodes.getNode(n.conf);
    	this.device = n.device;
        this.topic = n.topic;

    	var node = this;

        function msgHandler(message){
            var msg ={
                topic: node.topic || "",
                payload: {
                    command: message.header.name,
                    extraInfo: message.payload.appliance.additionalApplianceDetails
                }
            }

            switch(message.header.name){
                case "SetPercentageRequest":
                    msg.payload.value = message.payload.percentageState;
                    break;
                case "IncrementPercentageRequest":
                case "DecrementPercentageRequest":
                    msg.payload.value = message.payload.deltaPercentage.value;
                    break;
                case "SetTargetTemperatureRequest":
                    msg.payload.value = message.payload.targetTemperature.value;
                    break;
                case "IncrementTargetTemperatureRequest":
                case "DecrementTargetTemperatureRequest":
                    msg.payload.value = message.payload.deltaTemperature.value;
                    break;
            }

            node.send(msg);
        }

        node.conf.on('alexa'+node.device, msgHandler);

        node.conf.on('status',function(status){
            node.status(status);
        });

        node.on('close', function(){
            node.conf.removeListener(''+node.device,msgHandler);
        });

    }


    RED.nodes.registerType("alexa-home", alexaHome);

    RED.httpAdmin.use('/alexa-home/new-account',bodyParser.json());

    function getDevices(username, password, id){
        if (username && password) {
            request.get({
                url: 'https://alexa-node-red.eu-gb.mybluemix.net/api/v1/devices',
                auth: {
                    username: username,
                    password: password
                }
            }, function(err, res, body){
                if (!err) {
                    var devs = JSON.parse(body);
                    //console.log(devs);
                    devices[id] = devs;
                } else {
                    //console.("err: " + err);
                    RED.log.log("Problem looking up " + username + "'s devices");
                }
            });
        }
    };

    RED.httpAdmin.post('/alexa-home/new-account',function(req,res){
    	//console.log(req.body);
    	var username = req.body.user;
    	var password = req.body.pass;
    	var id = req.body.id;
    	getDevices(username,password,id);
    });

    RED.httpAdmin.post('/alexa-home/refresh/:id',function(req,res){
        var id = req.params.id;
        var conf = RED.nodes.getNode(id);
        if (conf) {
            var username = conf.username;
            var password = conf.credentials.password;
            getDevices(username,password,id);
            res.status(200).send();
        } else {
            //not deployed yet
            console.log("Can't refresh until deployed");
            res.status(404).send();
        }
    });

    RED.httpAdmin.get('/alexa-home/devices/:id',function(req,res){
    	if (devices[req.params.id]) {
    		res.send(devices[req.params.id]);
    	} else {
    		res.status(404).send();
    	}
    });


};