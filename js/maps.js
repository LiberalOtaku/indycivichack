// NOTE: Naming convention
//    stop = bus stop
//    station = bike station

// Global constants
var block = 152; // meters (~500ft)
var maxWalkDist = 4*block;
var minBikeDist = 3*block; // would use 4, adjusted for "straight line" distance

var WALKING = google.maps.DirectionsTravelMode.WALKING;
var TRANSIT = google.maps.DirectionsTravelMode.TRANSIT;
var BICYCLING = google.maps.DirectionsTravelMode.BICYCLING;
var DRIVING = google.maps.DirectionsTravelMode.DRIVING;

var IMPERIAL = google.maps.UnitSystem.IMPERIAL;

var stationIcon = 'https://www.pacersbikeshare.org/Controls/StationLocationsMap/Images/key-active.png';

// Other global vars
var origin, dest;
var mapProps, map, mapListener, directionsRenderer;

var directionsService = new google.maps.DirectionsService();
var directionsRequest, directionsResponse, steps; // directionsResponse = deep copy routes[0]
var distanceMatrixService = new google.maps.DistanceMatrixService();
var distanceMatrixRequest;

var bikeStations = new Array(); // List of all, sorted by distance to some point
var stationMarkers = {
  first: null,
  final: null
};

// List of routes to suggest to the user, likely multiple directions results
var suggestedRoutes = new Array();
var suggestedRouteTemplate = {
   directions: [], // google.maps.DirectionsResult
   rank: -1, // -1 invalid, 0 optimal, 1 forced, 2 super forced
   stationMarkers: [], // google.maps.Marker
   msg: '', // Including bikeshare is no more convenient. If ..., see bikeshare pins on map.
   totalDirs: -1, // directions.length==totalDirs => isComplete=true (-1 avoids issue on 0)
   isComplete: false // Flag to know when ready for DirectionsRenderer
};

var firstStop, finalStop, firstStation, finalStation;

// Default the origin to Indy for loadMap
var indy = { 'lat': 39.768377, 'lng': -86.158042 };
origin = new google.maps.LatLng(indy.lat, indy.lng);

// TODO: user input (currently, Central Library)
// dest = new google.maps.LatLng(39.778541, -86.156761);
// TODO: user input (currently, Old National Centre)
dest = new google.maps.LatLng(39.774480, -86.151075);


// TODO: Switch to calling getRoutes() on user input submit
// loadMap(): render map centered on geolocation|indy
function loadMap() {
  debugger;
  // geolocation if available, default Indy LatLng otherwise
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (pos) {
        console.log("Geolocation successful.");
        origin = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      } else {
        console.log("Geolocation is not supported on this phone/browser.");
        console.log("Position returned as: ", pos);
        console.log("Using default LatLong for Indianapolis: ", indy);
      };

      // Display the map
      mapProps = {
        center: origin,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };

      map = new google.maps.Map(document.getElementById("map-container"), mapProps);
      // map = new google.maps.Map($('#map-container')[0], mapProps);

      // setTimeout(getRoutes(), 10000);
      debugger;
    });
  } else {
    console.log("Geolocation is not supported on this phone/browser.");
    console.log("Using default LatLong for Indianapolis: ", indy);

    // Display the map
    mapProps = {
      center: origin,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById("map-container"), mapProps);
    // map = new google.maps.Map($('#map-container')[0], mapProps);

    // setTimeout(getRoutes(), 10000);
  };
}


// startSearch(): set dest to user input, then call getRoutes()
function startSearch() {
  var input = $('#search-field').val();
  console.log("input: ", input);

  var placesService = new google.maps.places.PlacesService(map);
  var placeReq = {
    query: input,
    location: origin,
    radius: 500
  };

  var geocoder = new google.maps.Geocoder();
  var req = {
    address: input
  };

  placesService.textSearch(placeReq, function (res, status, pagination) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      console.log("res: ", res);
      $('#search-field').val(res[0].formatted_address);
      dest = res[0].geometry.location;
      getRoutes();
    } else {
      console.log("nearbySearch FAILED with status: ", status);
    };
  });

  // geocoder.geocode(req, function (res, status) {
  //   if (status = google.maps.GeocoderStatus.OK && res[0]) {
  //     console.log("res[0]: ", res[0]);
  //     console.log("res[0].geometry.location: ", res[0].geometry.location);
  //     dest = new google.maps.LatLng( res[0].geometry.location );
  //     getRoutes();
  //   } else {
  //     console.log("Geocode request FAILED for search: ", input);
  //   };
  // });
}


// sortByDistance(arr, comparisonPoint): google.maps.geometry.spherical.computeDistanceBetween()
function sortByDistance(arr, comparisonPoint) {
  var dist1, dist2;

  arr.sort(function (pos1, pos2) {
    dist1 = google.maps.geometry.spherical.computeDistanceBetween(pos1, comparisonPoint);
    dist2 = google.maps.geometry.spherical.computeDistanceBetween(pos2, comparisonPoint);
    // console.log("dist1: ", dist1);
    // console.log("dist2: ", dist2);
    return dist1 - dist2;
  });
}


// closestInDirection(arr, pt1, pt2): pt1 is the point we should be close to
//  in the direction of the path between the two points
function closestInDirection(arr, pt1, pt2) {
  // pt1 = toLatLng(pt1);
  // pt2 = toLatLng(pt2);
  // Note: google.maps.geometry not defined outside this directionsService callback
  var getDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
  sortByDistance(arr, pt1);
  arr.forEach(function (curr, ind, arg) {
    // curr = toLatLng(curr);
    // If between start of prevStep and start of currStep, candidate
    if ( getDistanceBetween(curr, pt2)
      < getDistanceBetween(pt1, pt2) ) {

      return curr;
    }; // END if (between start of prevStep and start of currStep)
  }); // END arr.forEach callback
  console.log("FAILED to find closestInDirection");
  return arr[0];
}


// insertDirs(step, s, d, route, dirInd, mode):
//  breaks the given route step into walking to s, biking to d, walking
//  & adds these 3 directionsResponse objects to the suggestedRoute 'route'
//  at directions[dirInd] via deep copy & route.stationMarkers & route.msg
function insertDirs(step, s, d, route, dirInd, mode) {
  // Get optimal WALKING route (step.start_location->s)
  // THEN Get optimal <mode> (BICYCLING|TRANSIT) route (s->d)
  // THEN Get optimal
  var reqs = [
    {
      origin: ""+step.start_location.lat()+","+step.start_location.lng(),
      destination: ""+s.lat()+","+s.lng(),
      travelMode: WALKING,
      unitSystem: IMPERIAL
    },
    {
      origin: ""+s.lat()+","+s.lng(),
      destination: ""+d.lat()+","+d.lng(),
      travelMode: mode, // input param
      unitSystem: IMPERIAL
    },
    {
      origin: ""+d.lat()+","+d.lng(),
      destination: ""+step.end_location.lat()+","+step.end_location.lng(),
      travelMode: WALKING,
      unitSystem: IMPERIAL
    }
  ];

  for (var i = 0; i < 3; i--) {
    directionsService.route(
      reqs[i],
      function(response, status)
      {
        if (status == google.maps.DirectionsStatus.OK)
        {
          route.directions[dirInd+i] = JSON.parse(JSON.stringify( response ));
          if (dirInd+i == route.totalDirs) { route.isComplete = true; };
        } else {
          console.log("DirectionsService.route() FAILED with status: ", status);
        };
      } // END callback for directionsService
    ); // END directionsService.route()
  } // END for
}


// cpDirsFromStep(step, route, dirInd): Get directions using info from step
//  & add to the suggestedRoute 'route'
function cpDirsFromStep(step, route, dirInd) {
  var req = {
      origin: ""+step.start_location.lat()+","+step.start_location.lng(),
      destination: ""+step.start_location.lat()+","+step.start_location.lng(),
      travelMode: step.travel_mode,
      unitSystem: IMPERIAL
    };

  directionsService.route(
    req,
    function(response, status)
    {
      if (status == google.maps.DirectionsStatus.OK)
      {
        route.directions[dirInd] = JSON.parse(JSON.stringify( response ));
        if (dirInd == route.totalDirs) { route.isComplete = true; };
      } else {
        console.log("DirectionsService.route() FAILED for step: ", step);
        console.log("--> with status: ", status);
      };
    } // END callback for directionsService
  ); // END directionsService.route()
  // TODO: If BICYCLING, route.stationMarkers & route.msg
}


// cpAndInsertDirs(targetInd, step, s, d, route, dirInd, mode):
//  iterates steps to call cpDirsFromStep() and insertDirs()
function cpAndInsertDirs(targetInd, s, d, route, dirInd, mode) {
  // insertDirs() & cpDirsFromStep()
  // Leave any steps before/after stepNum-1 the same, bike until finalStation
  steps.forEach(function (curr, ind, arg) {
    if (ind == targetInd) {
      // Make space for insertDirs() to fill
      for (var i = 0; i < 3; i++) { route.directions[i] = null; }

      // async since it uses directionsService.route()
      insertDirs(
        curr, s, d,
        route, dirInd, mode ); // ptr to this route & starting index for directions array

      dirInd = dirInd + 3; // leaving the space for insertDirs()
    };

    cpDirsFromStep( curr, route, dirInd++ );
  });

  // Note: When directions.length == totalDirs, isComplete = true
  route.totalDirs += dirInd;
  return dirInd;
}


// toLatLng: converting <loc>.lat = # (same for lng) to the object
function toLatLng(loc) {
  var oLat = loc.lat;
  var oLng = loc.lng;
  return new google.maps.LatLng(oLat, oLng);
}


// TODO: function listSuggestedRoutes()
// TODO: function mapSuggestedRoute(ind)

// addBiking(stepNum, force): Add biking to the given walking step
// of the current route response from Google
// & add it to the 'suggestedRoutes' list of options to show the user
function addBiking(suggestedRoute, stepNum, force) {
  // Convenience variables
  // Note: google.maps.geometry not defined outside this directionsService callback
  var getDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
  var currStep = steps[stepNum];

  currStep.start_location = toLatLng(currStep.start_location);
  currStep.end_location = toLatLng(currStep.end_location);
  // console.log("IN addBiking -- currStep: ", currStep);

  firstStation = closestInDirection( bikeStations, currStep.start_location, currStep.end_location );

  finalStation = closestInDirection( bikeStations, currStep.end_location, currStep.start_location );

  var distToStation = getDistanceBetween( currStep.start_location, firstStation );
  var distFromStation = getDistanceBetween( finalStation, currStep.end_location );

  var ret, dirInd = 0;

// IF no need to force
  // If you save > half the walk || walking overage > dist extra walking for bike
  if ( ( distToStation + distFromStation < currStep.distance.value / 2 )
    || ( currStep.distance.value - maxWalkDist > distToStation + distFromStation )) {
    // If biking dist is worth bike check out/in
    if (getDistanceBetween(firstStation, finalStation) >= minBikeDist) {
      // Bike this step of trip
      console.log("Let's bike step #"+stepNum);

      dirInd = cpAndInsertDirs(stepNum, firstStation, finalStation, suggestedRoute, dirInd, BICYCLING);

      // TODO: route.stationMarkers & route.msg
    } else if (force) {
      console.log("Biking saves over half the walk, but it's not enough distance to bother with check out/in for the bike. But force was used.");

      dirInd = cpAndInsertDirs(stepNum, firstStation, finalStation, suggestedRoute, dirInd, BICYCLING);

      // TODO: route.stationMarkers & route.msg
    } else {
      console.log("Using DirectionsResponse from initial TRANSIT route.");
      suggestedRoute.directions[dirInd++] = JSON.parse(JSON.stringify( directionsResponse ));
    };
  }
// ELSE IF force
  else if (force) { // fudge the bus route to make biking some portion feasible

  // Look backward (toward prevStep.start_location), leave finalStation same
    if (stepNum != 0) {
      var prevStep = steps[stepNum-1];
      var isDoubleForce = false;

      sortByDistance(bikeStations, prevStep.start_location);

      bikeStations.forEach(function (currStation, ind, arg) {
        // If between start of prevStep and start of currStep, candidate
        if ( getDistanceBetween(currStation, currStep.start_location)
          < getDistanceBetween(prevStep.start_location, currStep.start_location) ) {

          console.log("Found BIKE STATION candidate for forced biking.");
          distToStation = getDistanceBetween(prevStep.start_location, currStation);

          // If > maxWalkDist, try to fudge transit route to force biking
          if ( ( stepNum-1 != 0 )
            && ( steps[stepNum-2].travel_mode == WALKING &&
            (steps[stepNum-2].distance.value + distToStation) > maxWalkDist )
            || ( steps[stepNum-2].travel_mode != WALKING && distToStation > maxWalkDist ) ) {

            console.log("> maxWalkDist. Attempting to fudge transit route to force biking.");

            // Iterate over busStops attempting to fudge transit route to force biking
            sortByDistance(busStops, currStation);

            busStops.forEach(function (currStop, ind, arg) {
              // If between start of steps[stepNum-2] and start of currStation, candidate
              if ( getDistanceBetween(currStop, steps[stepNum-2].start_location)
                < getDistanceBetween(currStation, steps[stepNum-2].start_location) ) {

                console.log("Found BUS STOP candidate for forced biking.");

                dirInd = cpAndInsertDirs( stepNum-2, steps[stepNum-2].start_location,
                  currStation, suggestedRoute, dirInd, TRANSIT );

                // TODO: route.stationMarkers & route.msg
              };
            }); // END busStops.forEach callback
          } else { // catches case where stepNum-1 == 0
            console.log("<= maxWalkDist. Swapping step #"+(stepNum-1)+" with biking.");

            dirInd = cpAndInsertDirs(stepNum-1, currStation, finalStation, suggestedRoute, dirInd, BICYCLING);

            // TODO: route.stationMarkers & route.msg
          };
        }; // END if (between start of prevStep and start of currStep)
      }); // END bikeStations.forEach callback
    }; // END if (stepNum != 0)

  // Look forward (toward nextStep.end_location)
    if (stepNum != steps.length-1) {
      var nextStep = steps[stepNum+1];

      sortByDistance(bikeStations, nextStep.end_location);

      bikeStations.forEach(function (currStation, ind, arg) {
        // If between start of nextStep and start of currStep, candidate
        if ( getDistanceBetween(currStation, currStep.start_location)
          < getDistanceBetween(nextStep.start_location, currStep.start_location) ) {

          console.log("Found BIKE STATION candidate for forced biking.");
          distToStation = getDistanceBetween(currStation, nextStep.start_location);

          // If > maxWalkDist, try to fudge transit route to force biking
          if ( ( stepNum+1 != steps.length-1 )
            && ( steps[stepNum+2].travel_mode == WALKING &&
            (steps[stepNum+2].distance.value + distToStation) > maxWalkDist )
            || ( steps[stepNum+2].travel_mode != WALKING && distToStation > maxWalkDist ) ) {

            console.log("> maxWalkDist. Attempting to fudge transit route to force biking.");

            // Iterate over busStops attempting to fudge transit route to force biking
            sortByDistance(busStops, currStation);

            busStops.forEach(function (currStop, ind, arg) {
              // If between start of steps[stepNum-2] and start of currStation, candidate
              if ( getDistanceBetween(currStop, steps[stepNum+2].start_location)
                < getDistanceBetween(currStation, steps[stepNum+2].start_location) ) {

                console.log("Found BUS STOP candidate for forced biking.");

                dirInd = cpAndInsertDirs(stepNum+2, steps[stepNum+2].start_location, currStation, suggestedRoute, dirInd, TRANSIT);

                // TODO: route.stationMarkers & route.msg
              };
            }); // END busStops.forEach callback
          } else { // catches case where stepNum+1 == steps.length-1
            console.log("<= maxWalkDist. Swapping step #"+(stepNum-1)+" with biking.");

            dirInd = cpAndInsertDirs(stepNum-1, currStation, finalStation, suggestedRoute, dirInd, BICYCLING);

            // TODO: route.stationMarkers & route.msg
          };
        }; // END if (between start of nextStep and start of currStep)
      }); // END bikeStations.forEach callback
    };
  } else {
    console.log("Adding biking to step #"+stepNum+" is not optimal and force override was not used. In this case, the bus directions alone are ideal.");

    console.log("Using DirectionsResponse from initial TRANSIT route.");
    suggestedRoute.directions[dirInd] = JSON.parse(JSON.stringify( directionsResponse ));
  };
}


// getRoutes(): Fills suggestedRoutes (global) array with options
function getRoutes() {
  // get current suggestedRoute from the return new length of the array after push
  var srInd = suggestedRoutes.push(
    JSON.parse(JSON.stringify( suggestedRouteTemplate )) ) - 1;
  suggestedRoute = suggestedRoutes[srInd];

  // Get optimal TRANSIT route (origin->dest)
  directionsRequest = {
    origin: ""+origin.lat()+","+origin.lng(),
    destination: ""+dest.lat()+","+dest.lng(),
    travelMode: TRANSIT,
    unitSystem: IMPERIAL
  };

  directionsService.route(
    directionsRequest,
    function(response, status)
    {
      if (status == google.maps.DirectionsStatus.OK)
      {
        console.log("Initial transit directions successfully received from Google.");
        directionsRenderer = new google.maps.DirectionsRenderer({
          map: map,
          directions: response
        });

        // Convenience variables
        // Note: google.maps.geometry not defined outside this directionsService callback
        var getDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;

        // TODO: If no bus route returned, look for bikeshare only option

        directionsResponse = JSON.parse(JSON.stringify( response.routes[0] ));
        // console.log("directionsResponse: ", directionsResponse);

        if (directionsResponse.legs.length > 1) {
          console.log("Oh... there's more than one leg in the route...");
        };

        steps = JSON.parse(JSON.stringify( directionsResponse.legs[0].steps ));
        // console.log("steps[ steps.length - 1 ].start_location.lat(): ", steps[ steps.length - 1 ].start_location.lng());

        // Get firstStop and finalStop (bus stops)
        //    steps[0] = walking to firstStop
        //    steps[length-1] = walking from finalStop

        // firstStop = new google.maps.LatLng(
        //   steps[ 0 ].end_location.lat(),
        //   steps[ 0 ].end_location.lng()
        // );

        // finalStop = new google.maps.LatLng(
        //   steps[ steps.length - 1 ].start_location.lat(),
        //   steps[ steps.length - 1 ].start_location.lng()
        // );

        // Request details of dest->finalStop via bike
        // distanceMatrixRequest = {
        //   destinations: [dest],
        //   origins: [finalStop],
        //   travelMode: BICYCLING,
        //   unitSystem: IMPERIAL
        // };
        // distanceMatrixService.getDistanceMatrix(distanceMatrixRequest, function (res, status) {
        //   if (status == google.maps.DistanceMatrixStatus.OK) {
        //     console.log("DistanceMatrixResponse: ", res);
        //   } else {
        //     console.log("DistanceMatrixRequest FAILED");
        //   }
        // });

        // var dist, currStation;
        // var infoWindow;

        // var busStopMarker = new google.maps.Marker({
        //   position: finalStop,
        //   title: finalStop.lat()+', '+finalStop.lng(),
        //   label: 'X'
        // });
        // busStopMarker.setMap(map);

        // infoWindow = new google.maps.InfoWindow({
        //   content: 'Final bus stop'
        // });
        // infoWindow.open(map, busStopMarker);

        $.getJSON('https://gbfs.bcycle.com/bcycle_pacersbikeshare/station_information.json', function(res){

          // console.log("res.data.stations: ", res.data.stations);

          // Create array of Google LatLng objects
          res.data.stations.forEach(function (curr, ind, arg) {
            bikeStations.push(new google.maps.LatLng(curr['lat'], curr['lon']));
          });

          // IF either walking stretch is over 4 blocks, biking part may be optimal
          if ( steps[ steps.length - 1 ].distance.value > maxWalkDist
            || steps[0].distance.value > maxWalkDist ) {

            console.log("Might be worth biking...");

            steps.forEach(function (curr, ind, arg) {
              if ( curr.travel_mode == 'WALKING' && curr.distance.value > maxWalkDist ) {
                console.log("Bike stretch #"+ind);
                addBiking( suggestedRoute, ind, 0 ); // add as an optimal route
                srInd = suggestedRoutes.push(
                  JSON.parse(JSON.stringify( suggestedRouteTemplate )) ) - 1;
                suggestedRoute = suggestedRoutes[srInd];
              };
            })

          } else {
            console.log("Not worth biking...");
          };

          // Force biking first
          addBiking( suggestedRoute, 0, 1 ); // bike first stretch, force=true
          srInd = suggestedRoutes.push(
            JSON.parse(JSON.stringify( suggestedRouteTemplate )) ) - 1;
          suggestedRoute = suggestedRoutes[srInd];

          // Force biking last
          addBiking( suggestedRoute, steps.length - 1, 1 ); // bike last stretch, force=true
          srInd = suggestedRoutes.push(
            JSON.parse(JSON.stringify( suggestedRouteTemplate )) ) - 1;
          suggestedRoute = suggestedRoutes[srInd];

          // Force biking WHOLE
          insertDirs({ start_location: origin, end_location: dest }, firstStation, finalStation, suggestedRoute, ind, BICYCLING);


          // TODO: listSuggestedRoutes();


          // TODO: MOVE THE CODE BELOW INTO addBiking()

          // console.log("MARKER firstStation: ", firstStation.lat()+', '+firstStation.lng());
          // stationMarkers.first = new google.maps.Marker({
          //   position: firstStation,
          //   title: firstStation.lat()+', '+firstStation.lng(),
          //   icon: stationIcon
          // });
          // stationMarkers.first.setMap(map);

          // console.log("MARKER finalStation: ", finalStation.lat()+', '+finalStation.lng());
          // stationMarkers.final = new google.maps.Marker({
          //   position: finalStation,
          //   title: finalStation.lat()+', '+finalStation.lng(),
          //   icon: stationIcon
          // });
          // stationMarkers.final.setMap(map);

          // TESTING: show all stations
          // for (var i = 0; i < bikeStations.length; i++) {
          //   // console.log("bikeStations[i]: ", bikeStations[i].lat()+', '+bikeStations[i].lng());
          //   stationMarkers.push( new google.maps.Marker({
          //     position: bikeStations[i],
          //     title: bikeStations[i].lat()+', '+bikeStations[i].lng(),
          //     icon: stationIcon
          //   }) );
          //   stationMarkers[i].setMap(map);
          // }

          // infoWindow = new google.maps.InfoWindow({
          //   content: 'firstStation'
          // });
          // infoWindow.open(map, stationMarkers.first);

          // infoWindow = new google.maps.InfoWindow({
          //   content: 'finalStation'
          // });
          // infoWindow.open(map, stationMarkers.final);

        }); // END $.getJSON()
      }
      else {
        console.log("Directions request FAILED with status: ", status);
        alert("Directions search failed. Please try again.");
      }
    } // END callback for directionsService
  ); // END directionsService.route()
} // END function getRoutes

// mapListener
// mapListener = google.maps.event.addDomListener(window, 'load', loadMap);
$(document).ready(function() {
  google.maps.event.addDomListener(window, 'load', loadMap);
});
