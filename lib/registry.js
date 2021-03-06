/*******************************************************************************
 *  Code contributed to the webinos project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	 http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2011 Alexander Futasz, Fraunhofer FOKUS
 ******************************************************************************/

(function () {
	var logger = console;

	/**
	 * Registry for service objects. Used by RPC.
	 * @constructor
	 * @alias Registry
	 * @param parent PZH (optional).
	 */
	var Registry = function(parent) {
		this.parent = parent;

		/**
		 * Holds registered Webinos Service objects local to this RPC.
		 *
		 * Service objects are stored in this dictionary with their API url as
		 * key.
		 */
		this.objects = {};
	};

	var _registerObject = function (callback) {
		if (!callback) {
			return;
		}
		logger.log("Adding: " + callback.api);

		var receiverObjs = this.objects[callback.api];
		if (!receiverObjs)
			receiverObjs = [];

		// generate id
		var md5sum = crypto.createHash('md5');
		callback.id = md5sum.update(callback.api + callback.displayName + callback.description).digest('hex');
		
		// verify id isn't existing already
		var filteredRO = receiverObjs.filter(function(el, idx, array) {
			return el.id === callback.id;
		});
		if (filteredRO.length > 0)
			throw new Error('Cannot register, already got object with same id.');

		receiverObjs.push(callback);
		this.objects[callback.api] = receiverObjs;
	};

	/**
	 * Registers a Webinos service object as RPC request receiver.
	 * @param callback The callback object that contains the methods available via RPC.
	 */
	Registry.prototype.registerObject = function (callback) {
		_registerObject.call(this, callback);

		if (this.parent && this.parent.synchronizationStart) {
			this.parent.synchronizationStart();
		}
		return callback.id;
	};

	/**
	 * Unregisters an object, so it can no longer receives requests.
	 * @param callback The callback object to unregister.
	 */
	Registry.prototype.unregisterObject = function (callback) {
		if (!callback) {
			return;
		}
		logger.log("Removing: " + callback.api);
		var receiverObjs = this.objects[callback.api];

		if (!receiverObjs)
			receiverObjs = [];

		var filteredRO = receiverObjs.filter(function(el, idx, array) {
			return el.id !== callback.id;
		});
		if (filteredRO.length > 0) {
			this.objects[callback.api] = filteredRO;
		} else {
			delete this.objects[callback.api];
		}

		if (this.parent && this.parent.synchronizationStart) {
			this.parent.synchronizationStart();
		}
	};

	/**
	 * Get all registered objects.
	 *
	 * Objects are returned in a key-value map whith service type as key and
	 * value being an array of objects for that service type.
	 */
	Registry.prototype.getRegisteredObjectsMap = function() {
		return this.objects;
	};

	/**
	 * Get service matching type and id.
	 * @param serviceTyp Service type as string.
	 * @param serviceId Service id as string.
	 */
	Registry.prototype.getServiceWithTypeAndId = function(serviceTyp, serviceId) {
		var receiverObjs = this.objects[serviceTyp];
		if (!receiverObjs)
			receiverObjs = [];

		var filteredRO = receiverObjs.filter(function(el, idx, array) {
			return el.id === serviceId;
		});

		if (filteredRO.length < 1) {
			if (/ServiceDiscovery|ServiceConfiguration|Dashboard/.test(serviceTyp)) {
				return receiverObjs[0];
			}
			return undefined;
		}

		return filteredRO[0];
	};

	Registry.prototype.emitEvent = function(event) {
		var that = this;
		Object.keys(this.objects).forEach(function(serviceTyp) {
			if (!that.objects[serviceTyp]) return;

			that.objects[serviceTyp].forEach(function(service) {
				if (!service.listeners) return;
				if (!service.listeners[event.name]) return;

				service.listeners[event.name].forEach(function(listener) {
					try {
						listener(event);
					} catch(e) {
						console.log('service event listener error:');
						console.log(e);
					};
				});
			});
		});
	};

	// Export definitions for node.js
	if (typeof module !== 'undefined'){
		exports.Registry = Registry;
		var crypto = require('crypto');
	} else {
		// export for web browser
		window.Registry = Registry;
	}
})();
