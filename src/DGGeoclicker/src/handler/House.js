L.DG.Geoclicker.Handler.House = L.DG.Geoclicker.Handler.Default.extend({

    statics: {
        Dictionary: {}
    },

    _page : 1,
    _isListOpenNow: false,
    _firmsOnPage: 20,
    _scrollThrottleInterval: 400,
    _scrollHeightReserve: 60,

    handle: function (results, type, callback) { // (Object, Function) -> Boolean
        if (!results.house) {
            return false;
        }

        this._firmList = null;
        this._houseObject = null;
        this._firmListObject = null;
        this._id = results.house.id;
        this._totalPages = 1;

        // this._defaultFirm = 141265771962688; // TODO Remove this mock for filial click tests

        this._api = this._controller.getCatalogApi();
        this._popup = this._view.getPopup();
        this._fillHouseObject(results.house);

        if (this._defaultFirm) {
            this._onHandleReady = callback;
            this._fillFirmListObject();
        } else {
            callback(this._houseObject);
        }
        return true;
    },

    _fillHouseObject: function (house) { // (Object)
        var attrs = house.attributes,
            data = {
                address: '',
                addressWithoutIndex: '',
                purpose: '',
                elevation: '',
                link: '',
                buildingname: '',
                firmsCount: attrs.filials_count
            },
            self = this;

        if (attrs.postal_code) {
            data.address += attrs.postal_code + ', ';
        }

        if (house.name) {
            house.name = data.addressWithoutIndex = house.name.split(", ").slice(1).join(", ");
            data.address += house.name;
        }

        if (attrs.building_name) {
            data.buildingname = attrs.building_name;
        }

        if (attrs.building_description) {
            data.purpose = attrs.building_description;
        }

        if (attrs.floors_count) {
            data.elevation = this.t("{n} floors", + attrs.floors_count);
        }

        if (attrs.filials_count > 0) {
            this._totalPages = Math.ceil(attrs.filials_count / this._firmsOnPage);
            data.showMoreText = this.t("Show organization in the building");
        }

        this._houseObject = {
            tmpl: this._view.getTemplate("house"),
            data: data,
            afterRender: function(){
                self._initShowMore();
                self._initPopupClose();
            }
        };
    },

    _fillFirmListObject: function(){
        var self = this,
            content = document.createElement('div');

        this._firmListObject = {
            tmpl: content,
            header: this._view.render({
                tmplFile: "popupHeader",
                data: this._houseObject.data
            }),
            footer: this._view.render({
                tmplFile: "popupFooter",
                data: {
                    hideFirmsText: this.t("Hide organization in the building")
                }
            }),
            afterRender: function(){
                self._initShowLess();
                self._initPopupClose();
                if (self.loader) {
                    this.firmListContainer.parentNode.appendChild( self._loader );  // "this" here is self._firmListObject
                }
            },
            firmListContainer: content
        };

        if (this._totalPages > 1) {
            this._loader = this._view._initLoader();
        }

        this._api.firmsInHouse(this._id, L.bind(this._initFirmList, this));
    },

    _initPopupClose: function() {
        this._controller.getMap().on('popupclose', L.bind(this._onPopupClose, this));
    },

    _onPopupClose: function() {
        if (this._firmList) {
            this._firmList.clearList();
            this._firmList = null;
        }
        this._loader = null;
        this._page = 1;
        this._isListOpenNow = false;
        this._popup.clearHeaderFooter();
        this._clearEventHandlers();
        this._scroller = undefined;
    },

    _initShowMore: function () {
        var link = this._popup._contentNode.querySelector('#dg-showmorehouse');

        if (link) {
            this._addEventHandler("DgShowMoreClick", link, 'click', L.bind(this._showMoreClick, this));
        }
    },

    _showMoreClick: function () {
        if (!this._firmListObject) {
            this._fillFirmListObject();
        }
        this._clearAndRenderPopup(this._firmListObject);
    },

    _initShowLess: function() {
        var link = this._popup._contentNode.querySelector('#dg-showlesshouse');

        if (link) {
            this._addEventHandler('DgShowLessClick', link, 'click', L.bind(this._showLessClick, this));
        }
    },

    _showLessClick: function () {
        this._isListOpenNow = false;
        this._clearAndRenderPopup(this._houseObject);
    },

    _clearAndRenderPopup: function(popupObject){
        this._clearEventHandlers();
        this._popup.clearHeaderFooter();
        this._view.renderPopup(popupObject);
    },

    _initFirmList: function (results) {
        this._firmList = new FirmCard.List({
                tmpls: {
                    loader: this._view.getTemplate("loader"),
                    shortFirm: this._view.getTemplate("shortFirm"),
                    fullFirm: this._view.getTemplate("fullFirm")
                },
                container: this._firmListObject.firmListContainer,
                render: L.DG.Template,
                defaultFirm: this._defaultFirm,
                ajax: L.bind(this._api.getFirmInfo, this._api),
                onReady: L.bind(this._renderFirmList, this),
                onToggleCard: L.bind(this._onFirmlistToggleCard, this)
            }, results
        );
    },

    _renderFirmList: function(){
        if (this._isListOpenNow) return;
        this._isListOpenNow = true;
        if (this._onHandleReady){
            this._onHandleReady( this._firmListObject );
            this._onHandleReady = null;
        }
        this._firmList.renderList();
        this._popup._resize();
        this._popup.fire();
        if ((this._totalPages > 1) && (this._scroller = this._popup._scroller)) {
            L.DomEvent.addListener( this._scroller,
                'scroll',
                L.Util.limitExecByInterval(L.bind(this._handleMouseWheel, this), this._scrollThrottleInterval)
            );
        }
    },

    _appendFirmList: function (results) { // (Object)
        this._firmList.addFirms(results);
        this._firmList.renderList();
        this._loader && this._view.hideLoader( this._loader );
        this._popup._baron.update();
    },

    _onFirmlistToggleCard: function(cardContainer, cardExpanded){
        if (cardExpanded) {
            this._popup._scroller.scrollTop = cardContainer.offsetTop - cardContainer.parentNode.offsetTop;
            this._handleMouseWheel(); // ??
        }
       /* var isAllCollapsed = this._firmList.getExpCardsNumber() === 0;
        if (!this._popup._baron || isAllCollapsed) {
            this._popup._resize(isAllCollapsed);
        }*/
        this._popup._resize();
    },

    _handleMouseWheel: function() {
        var scroller = this._scroller;

        if (scroller && scroller.scrollHeight <= scroller.scrollTop + scroller.offsetHeight + this._scrollHeightReserve) {
            this._handlePaging();
        }
    },

    _handlePaging: function () {
        this._page++;

        if (this._totalPages && this._page <= this._totalPages) {
            this._view.showLoader( this._loader );
            this._api.firmsInHouse(this._id, L.bind(this._appendFirmList, this), this._page);
        }
    }

});
