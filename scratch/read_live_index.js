const http = require('http');

http.get('http://localhost:3000/admindashboard/', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('--- HTTP RESPONSE ---');
        console.log(data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
