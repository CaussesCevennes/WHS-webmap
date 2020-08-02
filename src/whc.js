
var app = {

  language : 'fr',
  supportedLang : ['fr', 'en', 'es'],

  localPhotos : true,
  //avoid storing full url in the json file
  photoThumbRootUrl : "https://whc.unesco.org/uploads/thumbs/",
  photoFullRootUrl : "https://whc.unesco.org/document/",
  useAllPhotosLicenses : true,

  resizable : false,
  alphaShortcut : true,

  //categories used as marker layergroup
  //nota : cultural landscape category can regroup cultural or mixed sites
  categories : ['natural', 'cultural', 'cultural_landscape', 'mixed'],
  categoriesLabels : {
    'natural' : {'en': 'Natural', 'fr': 'Naturel', 'es': 'Natural'},
    'cultural' : {'en': 'Cultural', 'fr': 'Culturel', 'es': 'Cultural'},
    'cultural_landscape' : {'en': 'Cultural landscape', 'fr': 'Paysage culturel', 'es': 'Paisaje cultural'},
    'mixed' : {'en': 'Mixed', 'fr': 'Mixte', 'es': 'Mixto'}
  },

  //leaflet map
  map: undefined,
  flyToZoomLevel: 10,
  baseLayers: {}, //osm, bluemarble, c&c limits ...
  markersCluster: undefined,
  tocLayers: undefined,
  layerLegends: undefined,
  selectedMark: undefined, //leaflet marker
  get selectedProps() { //shortcut
    return this.selectedMark.feature.properties;
  },

  //json data
  photos : {}, //
  countryCodes : {}, //list of country codes and names in 3 language
  whsByCountry : {}, //whs group by country
  whsCountryCodes : [], //sorted list of country codes that have a whsite
  layerGroups : {}, //contain leaflet layergroup of cultural, natural ... whs location

  //photoIdx : 0, //current photo index
  loadedPhotos: 0, //number of photos currently loaded for the selected site

  //geographical region to focus on and their bounding box
  regions : {
    'cc':{'fr':'Causses & Cévennes','en':'Causses & Cévennes','es':'Causses & Cévennes', 'extent':[[43.6684,2.9178], [44.5811,4.1532]]},
    'occ':{'fr':'Occitanie','en':'Occitanie','es':'Occitanie', 'extent':[[42.3330,-0.3271], [45.0467,4.8455]]},
    'fr': {'fr':'France','en':'France','es':'Francia', 'extent':[[42.3330,-5.1413], [51.0890,8.2333]]},
    'med':{'fr':'Méditerranée','en':'Mediterranean','es':'Mediterráneo', 'extent':[[26.1188,-10.5669], [46.2818,30.7072]]},
    'eu': {'fr':'Europe','en':'Europe','es':'Europa', 'extent':[[52.65,-15.73],[35.62,26.02]]},
    'sc':{'fr':'Scandinavie','en':'Scandinavia','es':'Escandinavia', 'extent':[[67.14,-7.07],[54.90,37.67]]},
    'afn':{'fr':'Afrique du Nord','en':'North Africa','es':'Africa del norte', 'extent':[[19.412,-19.6376], [38.5255,37.963]] },
    'afs': {'fr':'Afrique du sud','en':'South Africa','es':'Africa del sur', 'extent':[[-38.3187,-19.2475], [18.8919,57.7267]] },
    'amn': {'fr':'Amérique du Nord','en':'North america','es':'América del norte', 'extent':[[15.6413,-127.5575], [55.2986,-51.8835]] },
    'ams':{'fr':'Amérique du sud','en':'South america','es':'América del sur', 'extent':[[-57.6922,-85.0396], [12.9108,-30.9497]] },
    'mo': {'fr':'Moyen orient','en':'Middle East','es':'Medio Oriente', 'extent':[[44.50,20.17],[13.33,83.45]] },
    'as': {'fr':'Asie','en':'Asia','es':'Asia', 'extent':[[56.40,67.37], [20.22,150.87]] },
    'ass': {'fr':'Asie du sud','en':'South Asia','es':'Asie del sur', 'extent':[[27.80,66.04], [-12.68,138.73]] },
    'oc':{'fr':'Océanie','en':'Oceania','es':'Oceanía', 'extent':[[-48.8506,111.2965], [-0.0916,182.5497]] },
    'sib':{'fr':'Sibérie', 'en':'Sibéria', 'es':'Siberiano', 'extent':[[79.77,52.31],[47.97,197.69]]},
    'arc':{'fr':'Arctique','en':'Artic','es':'ártico', 'extent':[[73.43,-65.88], [57.93,1.95]] }
  },

  get locIcons() {
    var options = {
      iconSize: [25, 40],
      popupAnchor: [0, -20],
    };
    var danger = {
      iconSize: [40, 70],
      popupAnchor: [0, -20],
    };
    return {
      'basic' : L.icon($.extend({iconUrl: 'icons/marker.svg'}, options)),
      'active' : L.icon($.extend({iconUrl: 'icons/marker_active.svg'}, options)),
      'natural' : L.icon($.extend({iconUrl: 'icons/marker_natural.svg'}, options)),
      'cultural' : L.icon($.extend({iconUrl: 'icons/marker_cultural.svg'}, options)),
      'cultural_landscape' : L.icon($.extend({iconUrl: 'icons/marker_cultural_landscape.svg'}, options)),
      'mixed_landscape' : L.icon($.extend({iconUrl: 'icons/marker_mixed_landscape.svg'}, options)),
      'mixed' : L.icon($.extend({iconUrl: 'icons/marker_mixed.svg'}, options)),
      'natural_danger' : L.icon($.extend({iconUrl: 'icons/marker_natural_danger.svg'}, danger)),
      'cultural_danger' : L.icon($.extend({iconUrl: 'icons/marker_cultural_danger.svg'}, danger)),
      'cultural_landscape_danger' : L.icon($.extend({iconUrl: 'icons/marker_cultural_landscape_danger.svg'}, danger)),
      'mixed_landscape_danger' : L.icon($.extend({iconUrl: 'icons/marker_mixed_landscape_danger.svg'}, danger)),
      'mixed_danger' : L.icon($.extend({iconUrl: 'icons/marker_mixed_danger.svg'}, danger))
    };
  },

  typeSiteIcons : {
    'natural' : 'icons/symbol_natural.svg',
    'cultural' : 'icons/symbol_cultural.svg',
    'cultural_landscape' : 'icons/symbol_cultural_landscape.svg',
    'mixed_landscape' : 'icons/symbol_mixed_landscape.svg',
    'mixed' : 'icons/symbol_mixed.svg',
    'natural_danger' : 'icons/symbol_natural_danger.svg',
    'cultural_danger' : 'icons/symbol_cultural_danger.svg',
    'cultural_landscape_danger' : 'icons/symbol_cultural_landscape_danger.svg',
    'mixed_landscape_danger' : 'icons/symbol_mixed_landscape_danger.svg',
    'mixed_danger' : 'icons/symbol_mixed_danger.svg',
  },


  reinit: function(){
    let self = this;
    self.toggleHomeTab();
    $('#sideView').hide();
    $('.chkFilter:checked').prop('checked', false).change();
    self.deselectWhSite();
    self.map.setView( [0, 0], 2);
    $('#welcomeScreen').css('display', 'block');
  },


  init : function(){
    var self = this;

    $('#welcomeScreen').css('display', 'block');

    if (self.resizable){
      //setup jquery resizable addon
      $("#map").resizable({
        handleSelector: "#split",
        resizeHeight: false,
        resizeWidthFrom: 'right',
        onDrag: function (e, $el) {
            self.map.invalidateSize();
        }
      });
    } else {$('#split').hide();}

    //make sure all checkbox are unchecked at startup
    $('.chkFilter:checked').prop('checked', false);

    //setup focus buttons
    for (reg in self.regions) {
      self.supportedLang.forEach(function(lang){
        $('#focusContainer').append("<button id=" + reg + " class='focusBt' lang="+lang + ">" + self.regions[reg][lang] + "</button>")
      });
    };

    //setup active language
    $('.langItem#'+self.language).addClass('activeLang');
    //$("[lang="+self.language+"]").addClass('activeLang');
    self.supportedLang.forEach(function(lang){
      if (lang != self.language){
        $("[lang="+lang+"]").hide();
      };
    });

    //setup letters shortcuts for searching country
    var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    alphabet.forEach(function(letter){
      $('#alphaShortcut').append("<button id=" + letter + " class='letterBt'>" + letter.toUpperCase() + "</button>")
    });
    if (!self.alphaShortcut){
      $('#alphaShortcut').hide();
    };

    //Loading map and data
    self._setupBasemap();
    self._loadWhData(function(){
      self._startTuto();
      self._connectEvents();
    });

  },

  _tutoStep : 0,

  _startTuto : function (){
    let self = this;
    $('.lds-ring').css('display', 'none');
    $('#startBt').css('display', 'block');
    $('#sideView').hide();
    $('#welcomeLang').append(
      $('#language').clone()
    );
    self._nextTuto();
    //connect events
    $('#welcomeScreen').on('click', '.tutoBt', function() {
      self._nextTuto();
    });
    $('#closeTuto').on('click', function(){
      self._closeTuto();
    });
  },

  _closeTuto : function(){
    let self = this;
    $('#welcomeScreen').css('display', 'none');
    $('#sideView').show();
    self._tutoStep = 0;
    self._nextTuto();
  },

  _nextTuto : function (step) {
    let self = this;
    self._tutoStep++;
    if(self._tutoStep == 1){$('.tutoNextBt').css('display','none')} else {$('.tutoNextBt').css('display','block')};
    if(self._tutoStep > 4){
      self._closeTuto();
      return;
    };
    $('.tuto').removeClass('activeStep');
    $('.step' + self._tutoStep).addClass('activeStep');
  },



  _setupBasemap : function () {
    var self = this;

    //fix white lines gap https://github.com/Leaflet/Leaflet/issues/3575
    var originalInitTile = L.GridLayer.prototype._initTile;
    L.GridLayer.include({
      _initTile: function (tile) {
        originalInitTile.call(this, tile);
        var tileSize = this.getTileSize();
        tile.style.width = tileSize.x + 1 + 'px';
        tile.style.height = tileSize.y + 1 + 'px';
      }
    });

    self.map = L.map('map',{
      zoomControl:false,
      center: [0, 0],
      zoom: 2,
      minZoom:2,
      maxZoom: 12,
      zoomSnap: 1,
      maxBounds: L.latLngBounds([[-90,-180], [90,180]]),
      maxBoundsViscosity: 0.75
    });

    self.map.attributionControl.setPrefix('© 2019'); //replace leaflet prefix

    //self.flyToZoomLevel = self.map.getMaxZoom();

    //self.tocLayers = L.control.layers(null, null, {position:'topleft'});
    //self.tocLayers.addTo(self.map);

    self.baseLayers['osm'] = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      continuousWorld: false,
      noWrap: true,
      minZoom: 9,
      attribution: 'OpenStreetMap contributors'
    }).addTo(self.map);
    //self.tocLayers.addOverlay(self.baseLayers['osm'], "OpenStreetMap");

    self.baseLayers['bluemarble'] = L.tileLayer('tiles/{z}/{x}/{y}.jpg', {
        tms: true,
        continuousWorld: false,
        noWrap: true,
        //maxNativeZoom: 8,
        maxZoom: 5,
        attribution: 'NASA Bluemarble'
    });//.addTo(self.map);
    //self.tocLayers.addOverlay(self.baseLayers['bluemarble'], "Bluemarble");

    self.baseLayers['stamen_terrain'] = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}', {
      continuousWorld: false,
      noWrap: true,
      attribution: 'Stamen Map Design',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 8, //ISSUE : lot of 404 errors with levels 9 and 10
      ext: 'png'
    }).addTo(self.map);


    self.baseLayers['stamen_toner_labels'] = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.{ext}', {
      attribution: 'Stamen Map Design CC BY 3.0',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 18,
      ext: 'png'
    });//.addTo(self.map);

    //add container filters
    $(self.baseLayers['stamen_terrain'].getContainer()).addClass('basemap');
    $(self.baseLayers['stamen_toner_labels'].getContainer()).addClass('basemap-labels');

    //setup clusters
    self.markersCluster = new L.MarkerClusterGroup({
      attribution : 'UNESCO World Heritage Center',
      animate: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 60, //the default is 80px
      iconCreateFunction: function(cluster) {
        var digits = String(cluster.getChildCount()).length;
        return L.divIcon({
          html: cluster.getChildCount(),
          className: 'cluster digits-' + digits,
          iconSize: null
        });
      }
    });

    /*
    $.getJSON("data/natural_earth_50_boundaries.geojson", function(data){
      self.baseLayers['boundaries'] = L.geoJson(data, {
        style: function (feature) {
          return {color: "white", weight: 1, opacity:1, interactive:false};
        }
      }).addTo(self.map);
    });

    var labels = undefined;
    $.getJSON("data/natural_earth_50_countries_centroids.geojson", function(data){
      labels = L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
              icon: L.divIcon({
                className: 'countryLabel',
                html: feature.properties.NAME_FR,
                iconSize: [100, 40]
              })
            });
          }
      });
    });
    //set labels zoom limits
    var displayingLabels = new L.FeatureGroup();
    displayingLabels.addTo(self.map);
    self.map.on('zoomend', function () {
        displayingLabels.clearLayers();
        labels.eachLayer(function (layer) {
          var area = layer.feature.properties.km2;
          if (area > 1000000 && self.map.getZoom() > 2) {
            displayingLabels.addLayer(layer);
            return;
          } else if (area > 100000 && self.map.getZoom() >= 4) {
            displayingLabels.addLayer(layer);
            return;
          } else if (area > 10000 && self.map.getZoom() >= 6) {
            displayingLabels.addLayer(layer);
            return;
          } else if (area > 2000 && self.map.getZoom() >= 7) {
            displayingLabels.addLayer(layer);
            return;
          } else if (area < 2000 && self.map.getZoom() >= 8) {
            displayingLabels.addLayer(layer);
          };
        });
    });
    */

    //Load C&C limits
    $.getJSON("data/cc.geojson", function(data){
      self.baseLayers['cc'] = L.geoJson(data, {
        style: function (feature) {
          switch (feature.properties.type) {
            case 'Zone inscrite': return {color: "red", dashArray:"5, 10", opacity:0.5};
            case 'Zone tampon': return {color: "black", dashArray:"5, 10", opacity:0.5};
          }
        }
      });//.addTo(self.map);
    });

    //set C&C limits display zoom levels
    self.map.on('zoomend', function () {
        console.log('Zoom level ' + self.map.getZoom());
        if (self.map.getZoom() > 5 ) {
          self.map.addLayer(self.baseLayers['cc']);
        } else if (self.map.hasLayer(self.baseLayers['cc'])){
          self.map.removeLayer(self.baseLayers['cc']);
        };
    });

    //Setup legend control
    self.layerLegends = {
      "Zonage UNESCO": ccLeg
    };
    var ccLeg = L.control({position: 'bottomright'});
    ccLeg.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'legend cc');
        div.innerHTML += '<i style="border:2px dashed black; background:transparent;"></i><p>Zone inscrite</p>';
        div.innerHTML += '<i style="border:2px dashed red; background:transparent;"></i><p>Zone tampon</p>';
        return div;
    };

    //display legend only if needed
    self.map.on('moveend', function(){
      if (self.baseLayers['cc'].getBounds().intersects(self.map.getBounds()) && self.map.hasLayer(self.baseLayers['cc']) ) {
        ccLeg.addTo(self.map);
      } else {
        ccLeg.remove();
      }
    });


  },


  _loadWhData : function(callback) {
    var self = this;
    $.when(
      //load the list of country codes and names in 3 language
      $.getJSON("data/countries_codes.json", function(data){
          self.countryCodes = data;
      }).then(function() {
        //Load list of WH sites and build leaflet layers
        $.getJSON("data/whc.geojson", function(data){
          self.categories.forEach(function(cat){
            var layerGroup = self._buildWhMarkerLayerGroup(data, cat);
            self.layerGroups[cat] = layerGroup;
            self.markersCluster.addLayers(layerGroup.getLayers());
          });
          self.layerGroups['danger'] = self._buildWhMarkerLayerGroup(data, 'danger');
          self.map.addLayer(self.markersCluster);
          self.loadCountryCodes(data); //warning this function need countries.codes.json to be loaded
          self.populateCountries();
        })
      }),
      //load list of wh sites photos
      $.getJSON("data/photos.json", function(data){
          self.photos = data;
      })
    ).then(function() {
        callback();
      });
    },


  _buildWhMarkerLayerGroup: function(data, whType) {
    var self = this;
    return L.geoJson(data,{
        filter: function(feature, layer) {
          if (whType == 'danger') {
            return feature.properties.danger;
          }
          if (whType == 'cultural_landscape') {
            return (feature.properties.cult_land); //can be cultural or mixed
          } else {
            return (feature.properties.category.toLowerCase() == whType && !feature.properties.cult_land);
          }
        },
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: self.locIcons[self.getSymbol(feature.properties)]});
        },
        onEachFeature: function (feature, layer) {
            var popup = L.popup({autoClose: false});
            popup.setContent(function() {return feature.properties[self.language+'_site'];});
            layer.bindPopup(popup);
            layer.on('mouseover', function (e){
                layer.openPopup();
            });
            layer.on('mouseout', function (e){
              layer.closePopup();
            });
            layer.on('click', function (e){
              self.selectWhSite(layer);
              self.selectedMark.openPopup();
              self._synchSearchLists();
            });
        }
      });
  },


  _connectEvents : function(){
    var self = this;

    /*
    $('#split').on('click', function (){
      $('#sideView').toggleClass('large');
    });
    */

    $('#tabBt_home').on('click', function (){
      self.toggleHomeTab();
    });

    $('#tabBt_focus').on('click', function (){
      self.toggleFocusTab();
    });

    $('#tabBt_infos').on('click', function (){
      self.toggleInfosTab();
    });

    $('#tabBt_search').on('click', function (){
      self.toggleSearchTab();
    });

    $('#countries_list, #fixedCountry').on('click', 'li', function(){
      self.populateWhSites($(this).attr('id'));
    });

    $('#whsByCountry_list').on('click', 'li', function(){
      self.selectWhSiteFromList($(this).attr('id'));
    });

    $('#focusContainer>button').on('click', function(){
      self.setFocus($(this).attr('id'));
    });

    $('#alphaShortcut>button').on('click', function(){
      self.scrollAlpha($(this).attr('id'));
    });

    $('#left, #modalLeft').on('click', function(){
      self.changePhoto(-1);
    });
    $('#right, #modalRight').on('click', function(){
      self.changePhoto(1);
    });

    $('.langItem').on('click', function(){
      self.updateLanguage($(this).attr('id'));
    });

    $('.chkFilter').on('change', function(){
      self.updateFilter($(this));
    });

    $('.symbolCat, .chkLabel').on('click', function(){
      let chk = $(this).parent().find(".chkFilter");
      if (chk.prop('checked')){chk.prop('checked', false)} else {chk.prop('checked', true)};
      self.updateFilter(chk);
    });

    $('.modalClose').on('click', function() {
      $('.modal').css('display', 'none');
    });

    $('#world').on('click', function() {
      self.map.flyToBounds( L.latLngBounds([[-90,-180], [90,180]]));
    });

    $('#help').on('click', function() {
      $('#sideView').hide();
      $('#welcomeScreen').css('display', 'block');
    });

    $('#sheep').on('click', function(){
      self.selectById('fr', '1153');
    });

    $('#twin1.twinBt').on('click', function(){
      self.selectById('ad', '1160');
    });

    $('#twin2.twinBt').on('click', function(){
      self.selectById('cn', '1248');
    });

    $('#photoContainer').on('click', '.photoThumb', function(){
      self.openPhoto($(this).attr('id'));
    });

  },





  //select a wh site by its country code and id
  //TODO actually whs data has stored only in whsByCountry array and in layerGroups array of markers goups by category
  //so there isn't global dictionnary of sites given by their id number, accessing data is only possible by country or by category
  //we need a work around here
  selectById : function(country, id){
    let self = this;
    $('.chkFilter:checked').prop('checked', false).change();
    var site = self.whsByCountry[country].find(elem => elem.id_number == id);
    self.map.flyTo(L.latLng(site['latitude'], site['longitude']), self.flyToZoomLevel);
    var layGroup = self.layerGroups[self.getCategory(site)];
    var marker = layGroup.getLayers().find(elem => elem.feature.properties.id_number == site.id_number);
    self.selectWhSite(marker);
    self._synchSearchLists();
  },

  _synchSearchLists : function(){
    let self = this;
    $('#countries_list>.selected').toggleClass("selected");
    var country = self.selectedProps.iso_code.split(',')[0];
    $('#countries_list>#'+country).toggleClass("selected");
    self.populateWhSites(country)
    $('#whsByCountry_list>.selected').toggleClass("selected");
    $('#whsByCountry_list>#' + self.selectedProps.id_number).toggleClass("selected");
  },
  //synch search panel


  /*
  //alt
  function toggleTab(id){ //id in [home, search, infos], = $(this).attr('id')
    $('.tabBt, .panelContent').removeClass('activeTab');
    $('.tabBt#'+id).toggleClass('activeTab');
    $('.panelContent#'+id).css('display', 'block');
  };*/

  toggleHomeTab: function(){
    $('.tabBt, .panelContent').removeClass('activeTab');
    $('#tabBt_home, #home_panel').addClass('activeTab');
  },

  toggleFocusTab: function(){
    $('.tabBt, .panelContent').removeClass('activeTab');
    $('#tabBt_focus, #focus_panel').addClass('activeTab');
  },

  toggleInfosTab: function(){
    $('.tabBt, .panelContent').removeClass('activeTab');
    $('#tabBt_infos, #infos_panel').addClass('activeTab');
    if (this.selectedMark){
      $('#infos_helper').css('display', 'none');
      $('#infos_content').css('display', 'block');
    } else {
      $('#infos_helper').css('display', 'block');
      $('#infos_content').css('display', 'none');
    }
    $('#tabBt_infos').focus();
  },

  toggleSearchTab: function(){
    $('.tabBt, .panelContent').removeClass('activeTab');
    $('#tabBt_search, #search_panel').addClass('activeTab');
    //Auto scroll
    this._scrollToSelectedCountry();
    this._scrollToSelectedSite();
  },

  setFocus: function(loc){
    this.map.flyToBounds(L.latLngBounds(this.regions[loc]['extent']));
  },

  scrollAlpha : function(letter){
    var item = $('#countries_list>li>span').filter( function() { return $(this).text().startsWith(letter.toUpperCase()); });
    $('#countries_list').animate({
      scrollTop: item.offset().top - $('#countries_list').offset().top + $('#countries_list').scrollTop()
    });
  },

  updateLanguage: function(selectedLang){
    var self = this;
    self.language = selectedLang;
    $('.langItem').removeClass('activeLang');
    $('.langItem#'+selectedLang).addClass('activeLang');

    $("[lang]").removeClass('activeLang');
    //$("[lang="+selectedLang+"]").addClass('activeLang');
    self.supportedLang.forEach(function(lang){
      if (lang != selectedLang){
        $("[lang="+lang+"]").hide();
      } else {
        $("[lang="+lang+"]").show();
      }
    });

    self.populateCountries();
    self.updateInfos();

  },

  //deprecated
  changePhoto : function(i){
    var self = this;
    var photos = self.photos[self.selectedMark.feature.properties.id_number]
    var n = photos.length;
    self.photoIdx += i;
    //loop over photos indexes
    if (self.photoIdx+1 > n){
      self.photoIdx = 0;
    } else if (self.photoIdx < 0){
      self.photoIdx = n-1;
    }
    var photo = photos[self.photoIdx];
    $('#photo').css("background-image", 'url('+photo['thumb']+')');
    $('#modalPhoto').attr("src", photo['thumb']);
  },


  getCategory: function(props) {
    if (props.cult_land) {
      return 'cultural_landscape';
    } else {
      return props.category.toLowerCase();
    };
  },

  getSymbol: function(props) {
    let k;
    if (props.cult_land && props.category.toLowerCase() == 'cultural') {
      k = 'cultural_landscape';
    } else if (props.cult_land && props.category.toLowerCase() == 'mixed') {
      k = 'mixed_landscape';
    } else {
      k = props.category.toLowerCase();
    };
    if (props.danger) {
      k += '_danger'
    };
    return k;
  },

  updateFilter: function(elem){
    var self = this;
    self.markersCluster.clearLayers();
    if (elem) {
      $('.chkFilter:checked:not(#'+elem.attr('id')+')').prop('checked', false);
    };
    var checkedId = $(".chkFilter:checked").attr('id');
    if (checkedId) {
      self.markersCluster.addLayers(self.layerGroups[checkedId].getLayers());
    } else {
      self.categories.forEach(function(cat){
        self.markersCluster.addLayers(self.layerGroups[cat].getLayers());
      });
    };
  },

  //select marker and update infos panel
  selectWhSite : function(layer){
    var self = this;
    //restore original icon
    if(self.selectedMark){
      self.selectedMark.setIcon(self.locIcons[self.getSymbol(self.selectedMark.feature.properties)]);
    };
    self.selectedMark = layer;

    self.toggleInfosTab();
    self.updateInfos();
    layer.setIcon(self.locIcons['active']);
  },

  deselectWhSite : function(){
    var self = this;
    if(self.selectedMark){
      self.selectedMark.setIcon(self.locIcons[self.getSymbol(self.selectedMark.feature.properties)]);
      self.selectedMark = undefined;
      $('#countries_list>.selected').toggleClass("selected");
      $('#whsByCountry_list').empty();
      $('#infos_helper').css('display', 'block');
      $('#infos_content').css('display', 'none');
    };
  },

  _groupByCountry: function(data, k) {
    var groups = {};
    data.features.forEach(function(item){
      var values = item.properties[k].split(",");
      values.forEach(function(val){
        groups[val] = groups[val] || [];
        groups[val].push(item.properties);
      });
    });
    return groups;
  },

  loadCountryCodes : function(data){
    var self = this;
    //group by country
    self.whsByCountry = self._groupByCountry(data, 'iso_code');
    delete self.whsByCountry[""];
    //build the sorted array of country list
    for (code in self.whsByCountry) {
      self.whsCountryCodes.push(code);
    };
    //sort using countries names instead of iso codes (get name from our reference dataset)
    self.whsCountryCodes.sort(function(a, b) {
      return self.countryCodes[a][self.language].localeCompare(self.countryCodes[b][self.language]);
    });
  },

  populateCountries: function(){
    var self = this;
    var selectedcountry = $('#countries_list>.selected').attr('id'); //keep memory of the already selected country
    $('#countries_list').empty();
    $('#whsByCountry_list').empty();
    self.whsCountryCodes.forEach(function(code){
      $('#countries_list').append(
        $("<li id=" + code + "><span>" + self.countryCodes[code][self.language] + "</span></li>")
        .prepend($("<img></img>").attr('src', 'icons/country_flags/' + code + '.svg'))
      );
    });
    if (selectedcountry){//will check for empty string, null, undefined, false, 0, nan
      $('#countries_list>#'+selectedcountry).toggleClass("selected");
      self.populateWhSites(selectedcountry);
    };
  },

  //callback executed when a country is selected in the list
  populateWhSites: function(selectedcountry){
    var self = this;
    $('#countries_list>.selected').toggleClass("selected"); //deselect previously selected
    $('#countries_list>#'+selectedcountry).toggleClass("selected"); //select the new one
    $('#whsByCountry_list').empty();
    self.whsByCountry[selectedcountry].sort(function(a, b) {
      var k = self.language+'_site';
      return a[k].localeCompare(b[k]);
    });
    self.whsByCountry[selectedcountry].forEach(function(whs){
      $('#whsByCountry_list').append(
        $("<li id=" + whs['id_number'] + "><span>" + whs[self.language+'_site'] + "</span></li>")
        .prepend($("<img></img>").attr('src', self.typeSiteIcons[self.getSymbol(whs)]))
      );
    });
    //reselect
    if (self.selectedMark){
      $('#whsByCountry_list>#'+self.selectedMark.feature.properties.id_number).toggleClass("selected");
      self._scrollToSelectedSite();
    };
  },


  _scrollToSelectedCountry: function(){
    if ($('#countries_list>.selected').length ){
      $('#countries_list').animate({
        scrollTop: $('#countries_list>.selected').offset().top - $('#countries_list').offset().top + $('#countries_list').scrollTop()
      });
    };
  },

  _scrollToSelectedSite: function(){
    if ($('#whsByCountry_list>.selected').length ){
      $('#whsByCountry_list').animate({
        scrollTop: $('#whsByCountry_list>.selected').offset().top - $('#whsByCountry_list').offset().top + $('#whsByCountry_list').scrollTop()
      });
    };
  },

  //callback executed when a site is selected in the list
  selectWhSiteFromList : function(selectedSite){
    var self = this;
    $('.chkFilter:checked').prop('checked', false).change(); //release filter and trigger change event
    $('#whsByCountry_list>.selected').toggleClass("selected");//unselect
    $('#whsByCountry_list>#'+selectedSite).toggleClass("selected");
    var country = $('#countries_list>.selected').attr('id');
    var sites = self.whsByCountry[country];
    var site = sites.find(elem => elem['id_number'] === selectedSite);
    self.map.flyTo(L.latLng(site['latitude'], site['longitude']), self.flyToZoomLevel);
    var layGroup;
    layGroup = self.layerGroups[self.getCategory(site)];
    var marker = layGroup.getLayers().find(elem => elem.feature.properties.id_number == site.id_number);
    self.selectWhSite(marker);
  },

  //Main infos update accross the current selected marker and selected language
  updateInfos : function(){
    var self = this;
    if(!self.selectedMark){
      return;
    } else {
      var feature = self.selectedMark.feature;
    };

    //Fill #infosPanel
    $('#siteName').text(feature.properties[self.language+'_site']);
    $('#typeSiteIcon').attr('src', self.typeSiteIcons[self.getSymbol(feature.properties)]);
    $('#typeSiteLabel').text(self.categoriesLabels[self.getCategory(feature.properties)][self.language]);
    $('#year').text(feature.properties.date_inscribed);
    if (feature.properties.area_hectares){
      $('#area').text(feature.properties.area_hectares + ' ha');
    } else {$('#area').text('nc')};
    //$('#criteria').text(feature.properties.criteria_txt);
    $('#description').text(feature.properties[self.language+'_short_description']);

    var countriesCodes = feature.properties.iso_code.split(",");
    $('#countries').empty(); //remove all childs
    countriesCodes.forEach(function(code, i){
      $('#countries').append(
        $("<div class='countryEntry'></div>").append(
          $("<img class='flag'></img>")
            .attr('src', 'icons/country_flags/' + code + '.svg'),
          $("<span class='value'>" + self.countryCodes[code][self.language] + "</span>")
        )
      );

    });

    /*
    //original code with previous/next photo buttons
    $('#photo').css("background", '');//clear
    self.photoIdx = 0;
    var photo = self.photos[feature.properties.id_number][self.photoIdx];
    $('.copyright').text(photo.copyright);
    */

    //Displaying photo as a carousel with bunch loading at scroll end
    $('#photoContainer, #modalPhotoGallery').off('scroll');
    $('#photoContainer, #modalPhotoGallery').scrollLeft(0); //nota : element must be visible
    $('#photoContainer, #modalPhotoGallery').empty();
    self.loadedPhotos = 0;
    var bunch = 5;

    if (!self.photos[feature.properties.id_number]){
      $('#photoContainer').append(
        $("<div id=0 class='photoThumb'></div>")
        .css('background-image', 'url(icons/nophoto.svg)')
      );
      return;
    };

    var photos = self.photos[feature.properties.id_number].filter(photo => self.isPhotoReusable(photo));
    if (!self.localPhotos){
      photos = photos.filter(photo => Boolean(photo.thumb)); //make sure photo thumb url exists
    }
    if (photos){
      self._loadPhotos(photos.slice(0, bunch));
    }
    //event at horizontal scroll end
    $('#photoContainer, #modalPhotoGallery').on('scroll', function() {
      if (Math.ceil($(this).scrollLeft() + $(this).innerWidth()) >= $(this)[0].scrollWidth) {
         console.log('coucou');
         self._loadPhotos(photos.slice(self.loadedPhotos, self.loadedPhotos + bunch));
      }
    });
    //synch the 2 galleries
    $('#modalPhotoGallery').on('scroll', function() {
      var photoItem = $('#photoContainer>#' + self._getThumbIdFromScroll($(this)));
      $('#photoContainer').scrollLeft( $('#photoContainer').scrollLeft() + (photoItem.offset().left - $('#photoContainer').offset().left) );
    });
  },

  _getThumbIdFromScroll : function(container){
    if (container.attr('id') == 'photoContainer') {
      var delta = container.innerWidth() * 0.75 + 10; //.photoThumb width + margin TODO get these values from css
      var offset = container.innerWidth() * 0.25 / 2 - 5 ; //at starting point we see only a part of the next photos
      var id = Math.round( (container.scrollLeft() + offset) / delta );
      return id;
    } else if (container.attr('id') == 'modalPhotoGallery') {
      return Math.round( container.scrollLeft() / container.innerWidth() );
    };
  },

  isPhotoReusable : function(photo){
      if (this.useAllPhotosLicenses) {return true;}
      //photosLicences = ['Creative Commons', 'All Right Reserved', 'Nomination File', 'Undefined'];
      if (photo.license.startsWith('Creative Commons') || photo.license.startsWith('Nomination File') ){
        return true;
      } else if (photo.copyright == '© UNESCO'){
        return true;
      } else if (photo.license.startsWith('All Right Reserved')) {
        return false;
      } else { //undefined
        return false;
      }
  },


  _loadPhotos : function(photos){
    var self = this;
    photos.forEach(function(photo, idx){
      if (self.localPhotos){
        var url = 'photos/' + self.selectedMark.feature.properties.id_number.padStart(4, '0') + '_' + photo['id'] + '.jpg';
        var url_thumb = url;
      } else {
        var url_thumb = self.photoThumbRootUrl + photo['thumb'];
        //var url = self.photoFullRootUrl + photo['id'];
        var url = url_thumb; //avoid loading large raw image file
      }
      let i = self.loadedPhotos + idx;
      //fill preview
      $('#photoContainer').append(
        $("<div id="+ i +" class='photoThumb'></div>")
        .css('background-image', 'url(' + url_thumb + ')')
        .append(
          $("<div class='copyright'></div>")
          .text(photo.copyright)
        )
      );
      //fill modal gallery (TODO => fill with thumb or full res photo)
      $('#modalPhotoGallery').append(
        $("<div id="+ i +" class='modalPhotoItem'></div>")
        .append(
          $("<div class='caption'></div>")
            //TODO add the title ? (titles are rarely relevant...), year?, licence?
            .text(self.selectedProps[self.language+'_site'] + ' - ' + photo.copyright),
          $("<div class='modalPhoto'></div>")
            .css('background-image', 'url(' + url + ')')
        )
      );
    });
    //
    self.loadedPhotos += photos.length;

  },

  //open photo in modal full screen
  openPhoto: function(thumbIdx){
    $('#fullScreenPhoto').css('display', 'block');
    //scroll to the selected photo
    //nota : it's not possible to compute offset of hidden elements (display:none) or elements with an ongoing animation
    var modalPhotoItem = $('#modalPhotoGallery>#' + thumbIdx);
    $('#modalPhotoGallery').scrollLeft(
      $('#modalPhotoGallery').scrollLeft() + (modalPhotoItem.offset().left - $('#modalPhotoGallery').offset().left)
    );
    /*
    //test load full size photo (TODO we need to load it at each photo scroll not only at open event)
    var documentId = this.photos[this.selectedMark.feature.properties.id_number][thumbIdx]['id'];
    var url = 'https://whc.unesco.org/document/' + documentId;
    var temp = $('<img>'); //create a temp <img> that will trigger an event when the image will be fully loaded
    temp.on('load', function(){
      modalPhotoItem.children(".modalPhoto").css('background-image', 'url('+url+')');
    });
    temp.attr("src", url);
    */
  },

};


var idleTime = 0;

$(document).ready(function() {
  app.init();
  //Increment the idle time counter every minute.
  setInterval(function () {
    idleTime++;
    if (idleTime > 9) { // 10 min
      app.reinit();
      idleTime = 0;
    };
  }, 60000); // 1 min

  //Reset the idle timer on mouse movement.
  $(this).mousemove(function (e) {
      idleTime = 0;
  });
  $(this).keypress(function (e) {
      idleTime = 0;
  });


});
