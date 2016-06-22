var trip = {
  init: function(formSelector) {
    this.form = $(formSelector);
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.form.submit(this.submitForm.bind(this));
  },

  submitForm: function(event) {
    event.preventDefault();
    var ul = $('ul.trip-details');
    ul.slideUp().html('');

    // get list of routes and times
    var random = {
      directions: [ {
        routes: [{
          legs: [{
            steps: [{
              travel_mode: 'WALKING',
              distance: 435,
              duration: 578987
            }]
          }]
        }]
      }, {
        routes: [{
          legs: [{
            steps: [{
              travel_mode: 'BICYCLING',
              distance: 435,
              duration: 578987
            }]
          }]
        }]
      }, {
        routes: [{
          legs: [{
            steps: [{
              travel_mode: 'WALKING',
              distance: 435,
              duration: 578987
            }]
          }]
        }]
      }, {
        routes: [{
          legs: [{
            steps: [{
              travel_mode: 'BUS',
              distance: 435,
              duration: 578987
            }]
          }]
        }]
      } ], // google.maps.DirectionsResult
      rank: 0, // -1 invalid, 0 optimal, 1 forced, 2 super forced
      stationMarkers: [], // google.maps.Marker
      msg: '', // Including bikeshare is no more convenient. If ..., see bikeshare pins on map.
      totalDirs: 7, // directions.length==totalDirs => isComplete=true (-1 avoids issue on 0)
      isComplete: true // Flag to know when ready for DirectionsRenderer
    };

    // for each route:
    ul.append(trip.buildRouteInfo(random));

    ul.slideDown();
  },

  buildRouteInfo: function(route) {
    var icons = $('<div/>');
    var totalDuration = 0;
    var totalDistance = 0;
    $.each(route.directions, function(i, object) {
      var step = object.routes[0].legs[0].steps[0];
      switch(step.travel_mode) {
        case 'WALKING':
          icons.append($('<i/>').attr({
            "src":
          })).text('');
          break;
        case 'BICYCLING':
          icons.append($('<i/>').attr({
            "src":
          })).text('');
          break;
        case 'BUS':
          icons.append($('<i/>').attr({
            "src":
          })).text('');
          break;
      }
      totalDuration += step.duration;
      totalDistance += step.distance;
    });

    var icons_list = $('<li/>').attr({ "class": "icons", }).append(icons);

    var duration = $('<li/>').attr({ "class": "duration", }).text('Total Duration: ' + totalDuration + ' minutes');
    var distance = $('<li/>').attr({ "class": "distance", }).text('Total Distance: ' + totalDistance + ' meters');
    var list = $('<ul/>').append(icons_list, duration, distance);

    return $('<div/>').attr({ "class": "suggested-route", }).append(list);
  },
};

trip.init('#tripForm');
