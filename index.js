var mysql = require('mysql');
var fs = require('fs');
var qr = require('qr-image');

// Create a database connection
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'woonzorg'
});


// get adres and id from database
connection.query('SELECT woning.id, complex.adres FROM complex INNER JOIN woning ON complex.id = woning.complex_id', function (error, results, fields) {
    if (error) throw error;

    //loop through results
    for (var i = 0; i < results.length; i++) {
        //create qr code for id
        var qr_svg = qr.image(results[i].id, { type: 'png' });

        // remove illegal characters from adres for filename
        var filename = results[i].adres.replace(/[^a-zA-Z0-9]/g, '');

        //create directory for qr code if not exists
        if (!fs.existsSync('./qr/' + filename)) {
            fs.mkdirSync('./qr/' + filename);
        }

        qr_svg.pipe(require('fs').createWriteStream('./qr/' + filename + '/' + results[i].id + '.png'));
    }
});