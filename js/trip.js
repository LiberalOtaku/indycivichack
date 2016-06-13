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

    // get list of routes and times

    $('div.trip-area').append(trip.buildRouteInfo(bus, bike, walk));
  },

  buildRouteInfo: function(bus, bike, walk) {
    var busTime = $('<li/>').text("Bus Time: " + bus + " Minutes");
    var bikeTime = $('<li/>').text("Biking Time: " + bike + " Minutes");
    var walkTime = $('<li/>').text("Walking Time: " + walk + " Minutes");

    var ul = $('<ul/>').slideUp()
      .attr({
        "class": "trip-details",
        "show": "false",
      })
      .append(busTime, bikeTime, walkTime);

    var button = $('<a/>').attr({
      href: "#",
    }).text("Show Details")
      .click(function() {
      if (ul.attr("show")) {
        ul.slideUp().attr({ "show": "false", });
        button.text("Show Details");
      }
      else {
        ul.slideDown().attr({ "show": "true", });
        button.text("Hide Details");
      }
    });

    return $('<div/>').append(button, ul);
  },
};

trip.init('#tripForm');
