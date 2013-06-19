L.DG.Geoclicker.Provider.CatalogApi = L.Class.extend({
    options: {
        urlGeo: '__WEB_API_SERVER__/geo/search',
        urlAdvanced: '__WEB_API_SERVER__/advanced',
        data: {
            key: '__WEB_API_KEY__',
            key: '__GEOCLICKER_CATALOG_API_KEY__',
            version: '__WEB_API_VERSION__',
            output: 'jsonp'
        },

        timeoutMs: 5000
    },

    initialize: function (map) { // (Object)
        this._map = map;
    },

    getLocations: function (options) { // (Object)
        // Callback will receive array of found results or void if errors occurred or nothing was found.
        var zoom = options.zoom,
            latlng = options.latlng,
            callback = options.callback,
            showLoaderAndPopup = options.showLoaderAndPopup || function() {},
            types = this.getTypesByZoom(zoom),
            q = latlng.lng + ',' + latlng.lat;
        if (!types) {
            callback({
                "error": "no type"
            });
            return;
        }
        showLoaderAndPopup();
        this.geoSearch(q, types, zoom, L.bind(function (result) {
            callback(this._filterResponse(result, types));
        }, this));
    },

    firmsInHouse: function (houseId, callback, page) { // (String, Function, Number)
        page = page || 1;
        var params = L.extend(this.options.data, {
            criteria: JSON.stringify({
                what: {
                    id: houseId,
                    type: "house"
                },
                types: ["firm"],
                sort: "relevance",
                page: page
            })
        });

        this.cancelLastRequest();

        function responseHandler(res) {
            if (res && res.response_code == 200 && res.results && res.results.firm && res.results.firm.results && res.results.firm.results.length) {
                callback(res.results.firm.results)
            } else {
                callback();
            }
        }

        this._performRequest(params, this.options.urlAdvanced, responseHandler, responseHandler);
    },

    geoSearch: function (q, types, zoomlevel, callback) { // (String, String, Number, Function)
        var params = {
            q: q,
            types: types,
            zoomlevel: zoomlevel
        };

        this.cancelLastRequest();

        this._performRequest(params, this.options.urlGeo, callback, function () {
            callback()
        });
    },

    cancelLastRequest: function () {
        if (this._lastRequest) {
            this._lastRequest.cancel();
        }
    },

    getTypesByZoom: function (zoom) { // (Number) -> String|Null
        if (zoom > 15) {
            return 'house,street,sight,station_platform,district';
        } else if (zoom > 14) {
            return 'house,street,district';
        } else if (zoom > 13) {
            return 'district,house';
        } else if (zoom > 12) {
            return 'district';
        } else if (zoom > 11) {
            return 'settlement,city,district';
        } else if (zoom > 8) {
            return 'settlement,city';
        } else if (zoom > 7) {
            return 'city';
        } else {
            return null;
        }
    },

    _performRequest: function (params, url, callback, failback) { // (Object, String, Function, Function)
        var source = this.options.data,
            data = L.extend({ // TODO clone function should be used instead of manually copying
                key: source.key,
                version: source.version,
                lang: this._map.getLang(),
                output: source.output
            }, params);

        this._lastRequest = L.DG.Jsonp({
            url: url,
            data: data,
            timeout: this.options.timeoutMs,
            success: callback,
            error: failback
        })
    },

    _filterResponse: function (response, allowedTypes) { // (Object, Array) -> Boolean|Object
        var result = {}, i, item, found;

        if (this._isNotFound(response)) {
            return false;
        }

        for (i in response.result) {
            item = response.result[i];

            if (allowedTypes && allowedTypes.indexOf(item.type) === -1) {
                continue;
            }

            result[item.type] = item;
            found = true;
        }

        if (found) {
            return result;
        } else {
            return false;
        }
    },

    _isNotFound: function (response) { // (Object) -> Boolean
        return !response || !!response.error_code || !response.result || !response.result.length;
    }

});