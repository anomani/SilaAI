const {createAppointment} = require('./appointment');
const {createClient} = require('./client');


async function main() {
    const res = await createAppointment(3367, '2024-05-01', '10:00', '11:00', 'test', 'test');
    console.log(res);
}
// Mahnoor - 67
// Wafa - 3368
// Adam - 3367

main();