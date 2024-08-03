const appointmentTypes = {
    "Adult - (Full Service)": { id: 22874968, price: 100, duration: 60, group: 2 },
    "OFF DAY/EMERGENCY - (Full Service)": { id: 15060525, price: 150, duration: 60, group: 3 },
    "Adult Cut": { id: 15050466, price: 55, duration: 30, group: 1 },
    "High-School Cut": { id: 14803389, price: 45, duration: 30, group: 1 },
    "Kids Cut - (12 & Under)": { id: 3413025, price: 35, duration: 30, group: 1 },
    "Lineup + Taper": { id: 15051749, price: 35, duration: 30, group: 1 },
    "Beard Grooming Only": { id: 15051757, price: 30, duration: 30, group: 1 },
};

const addOns = {
    "Beard Grooming": { id: 187938, price: 20, duration: 15 },
    "Beard Grooming for Lineup + Taper": { id: 1128808, price: 0, duration: 0 },
    "Colour Enhancement": { id: 187944, price: 20, duration: 15 },
    "Hot Towel + Black Mask Treatment for Clogged Pores": { id: 187941, price: 10, duration: 0 },
    "Wax - Hair Removal": { id: 1128727, price: 5, duration: 0 }
};

module.exports = { appointmentTypes, addOns };