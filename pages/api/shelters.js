const SHELTERS = [
  {
    id: 1,
    name: "Downtown Community Gym",
    address: "1011 E Street, Eureka, CA",
    phone: "(707) 555-0199",
    occupied: 412,
    total: 600,
    cap: "412 / 600",
    status: "Open",
    facilities: ["Pets welcome", "ADA access", "Medical", "Hot Meals"],
    lat: 40.802,
    lon: -124.163,
  },
  {
    id: 2,
    name: "Cedar Street Emergency Shelter",
    address: "2450 Cedar St, Eureka, CA",
    phone: "(707) 555-0142",
    occupied: 180,
    total: 250,
    cap: "180 / 250",
    status: "Open",
    facilities: ["Pets welcome", "Family rooms", "Childcare"],
    lat: 40.812,
    lon: -124.181,
  },
  {
    id: 3,
    name: "Riverside High School Shelter",
    address: "3750 Harris Ave, Eureka, CA",
    phone: "(707) 555-0188",
    occupied: 540,
    total: 800,
    cap: "540 / 800",
    status: "Open",
    facilities: ["ADA access", "Medical", "Charging Stations", "Showers"],
    lat: 40.789,
    lon: -124.135,
  },
  {
    id: 4,
    name: "Hope Community Center",
    address: "520 Highland Ave, Eureka, CA",
    phone: "(707) 555-0123",
    occupied: 95,
    total: 150,
    cap: "95 / 150",
    status: "Open",
    facilities: ["Family rooms", "Pets welcome", "Wi-Fi"],
    lat: 40.828,
    lon: -124.152,
  },
  {
    id: 5,
    name: "St. Anne's Parish Hall",
    address: "1820 F Street, Eureka, CA",
    phone: "(707) 555-0167",
    occupied: 110,
    total: 120,
    cap: "110 / 120",
    status: "Limited Space",
    facilities: ["ADA access", "Hot Meals"],
    lat: 40.841,
    lon: -124.198,
  },
  {
    id: 6,
    name: "North County Armory Shelter",
    address: "4200 Boeing Ave, McKinleyville, CA",
    phone: "(707) 555-0210",
    occupied: 120,
    total: 500,
    cap: "120 / 500",
    status: "Open",
    facilities: ["ADA access", "Medical", "Vehicle Parking", "Pet Pens"],
    lat: 40.865,
    lon: -124.120,
  }
];

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function handler(req, res) {
  const { id, lat, lon } = req.query;

  if (id) {
    const shelter = SHELTERS.find((s) => s.id === Number(id));
    if (!shelter) return res.status(404).json({ success: false, error: "Shelter not found" });
    return res.status(200).json({ success: true, data: shelter });
  }

  const userLat = parseFloat(lat) || 40.802;
  const userLon = parseFloat(lon) || -124.163;

  const sheltersWithDist = SHELTERS.map((s) => {
    const distanceMiles = haversineMiles(userLat, userLon, s.lat, s.lon);
    return {
      ...s,
      distMiles: distanceMiles,
      dist: `${distanceMiles.toFixed(1)} mi`,
    };
  }).sort((a, b) => a.distMiles - b.distMiles);

  res.status(200).json({
    success: true,
    data: { shelters: sheltersWithDist, count: sheltersWithDist.length },
  });
}

