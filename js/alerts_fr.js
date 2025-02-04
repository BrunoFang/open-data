let activeAlert = 1;

/**
* Function to capitalize the first letter of a string
*/
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Elements that make up the popup.
 */
let container = document.getElementById("popup");
let content = document.getElementById("popup-content");
let closer = document.getElementById("popup-closer");
let nav = document.getElementById("nav");
let navText = document.getElementById("nav-text")
let navLeftBtn = document.getElementById("left-btn")
let navRightBtn = document.getElementById("right-btn")

const alert_type_map = {
  'statement': 'veille',
  'warning': 'alerte',
  'watch': 'sous surveillance',
  'advisory': 'bulletin',
}

/**
* Create an overlay to anchor the popup to the map.
*/
let overlay = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */
closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

navLeftBtn.onclick = () => {
  let alerts = document.querySelectorAll(`[id^="alert-"]`);
  if (activeAlert > 1) {
    activeAlert--
  }
  if (activeAlert === 1) {
    navLeftBtn.disabled = true;
    navRightBtn.disabled = false;
  } else {
    navLeftBtn.disabled = false;
    navRightBtn.disabled = false;
  }
  for (alert_ of alerts) {
    alert_num = parseInt(alert_.id.split("-")[1])
    if (alert_num !== activeAlert) {
      alert_.style.display = "none";
    } else {
      alert_.style.display = "";
    }
  }
  navText.innerText = `${activeAlert} of ${alerts.length}`
}

navRightBtn.onclick = () => {
  let alerts = document.querySelectorAll(`[id^="alert-"]`);
  if (activeAlert < alerts.length) {
    activeAlert++
  }
  if (activeAlert === alerts.length) {
    navRightBtn.disabled = true;
    navLeftBtn.disabled = false;
  } else {
    navRightBtn.disabled = false;
    navLeftBtn.disabled = false;
  }
  for (alert_ of alerts) {
    alert_num = parseInt(alert_.id.split("-")[1])
    if (alert_num !== activeAlert) {
      alert_.style.display = "none";
    } else {
      alert_.style.display = "";
    }
  }
  navText.innerText = `${activeAlert} of ${alerts.length}`
}

let layers = [
  new ol.layer.Tile({
    source: new ol.source.OSM()
  }),
  new ol.layer.Tile({
    opacity: 0.7,
    source: new ol.source.TileWMS({
      url: "https://geo.weather.gc.ca/geomet",
      params: {
        LAYERS: "ALERTS",
        TILED: true
      },
      transition: 0
    })
  })
];

let map = new ol.Map({
  target: "map",
  layers: layers,
  overlays: [overlay],
  view: new ol.View({
    center: ol.proj.fromLonLat([-97, 57]),
    zoom: 3
  })
});

map.on("singleclick", function (evt) {
  // reset state
  nav.style.display = 'none'
  navLeftBtn.disabled = true;
  navRightBtn.disabled = false;
  activeAlert = 1
  overlay.setPosition(undefined);
  // get coordinates
  let coordinate = evt.coordinate;
  let viewResolution = map.getView().getResolution();
  let wms_source = map.getLayers().item(1).getSource();
  let url = wms_source.getFeatureInfoUrl(
    coordinate,
    viewResolution,
    "EPSG:3857", {
    INFO_FORMAT: "application/json",
    FEATURE_COUNT: 10
  }
  );
  if (url) {
    fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (json) {
        if (json.features.length > 0) {
          overlay.setPosition(evt.coordinate);
          let alerts = json.features.map((e, i) => {
            let alert_area = e.properties.zone;
            let alert_headline = e.properties.titre;
            let alert_type = e.properties.alert_type;
            let alert_description = e.properties.descrip_fr;
            let effective_datetime = luxon.DateTime.fromISO(e.properties.effective)
              .toUTC()
              .toISO({ suppressMilliseconds: true })
            let expires_datetime = luxon.DateTime.fromISO(e.properties.expires)
              .toUTC()
              .toISO({ suppressMilliseconds: true })
            return `
            <div id=alert-${i + 1} ${i > 0 ? "style='display: none;'" : ""}>
              <b>${capitalizeFirstLetter(alert_area)}</b><br>
              <b>${capitalizeFirstLetter(alert_headline)}</b><br><br>
              Type: <span style="text-transform: capitalize;">${alert_type_map[alert_type]}</span><br>
              Effectif: ${effective_datetime}<br>
              Expiration: ${expires_datetime}<br>
              <br>
              <div class="alert-descrip"><b>Description:</b> <br> ${alert_description}</div>
           </div>
          `;
          });
          if (json.features.length > 1) {
            navText.innerText = `${activeAlert} of ${json.features.length}`
            nav.style.display = 'flex';
            nav.style.justifyContent = 'center';
            nav.style.flexDirection = 'column';
            nav.style.alignItems = 'center';
          }
          let alerts_join = alerts.join("");
          content.innerHTML = alerts_join;
        }
      });
  }
});