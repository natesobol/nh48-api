const DEFAULT_PRECISION = 6;

function decodeValue(encoded, index){
  let result = 0;
  let shift = 0;
  let byte = null;

  do{
    if(index.value >= encoded.length){
      return null;
    }
    byte = encoded.charCodeAt(index.value++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  }while(byte >= 0x20);

  const delta = (result & 1) ? ~(result >> 1) : (result >> 1);
  return delta;
}

export function decodePolyline6(encoded, precision = DEFAULT_PRECISION){
  if(!encoded){
    return [];
  }
  const factor = Math.pow(10, precision);
  const index = { value: 0 };
  let lat = 0;
  let lon = 0;
  const coordinates = [];

  while(index.value < encoded.length){
    const latDelta = decodeValue(encoded, index);
    const lonDelta = decodeValue(encoded, index);
    if(latDelta == null || lonDelta == null){
      break;
    }
    lat += latDelta;
    lon += lonDelta;
    coordinates.push({ lat: lat / factor, lon: lon / factor });
  }

  return coordinates;
}
