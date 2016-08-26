var concat = require('gulp-concat');
var gulp = require('gulp');
var util = require('gulp-util');
var path = require('path');

var config = require('../../app/config.js');
var deps = require('../deps')(config);

function getLeafletFiles(compsBase32) {
    var memo = {},
        deps = require('leaflet/build/deps.js').deps,
        comps;

    if (compsBase32) {
        comps = parseInt(compsBase32, 32).toString(2).split('');
        console.log('Managing dependencies...');
    }

    function addFiles(srcs) {
        for (var j = 0, len = srcs.length; j < len; j++) {
            memo[srcs[j]] = true;
        }
    }

    for (var i in deps) {
        if (comps) {
            if (parseInt(comps.pop(), 2) === 1) {
                console.log(' * ' + i);
                addFiles(deps[i].src);
            } else {
                console.log('   ' + i);
            }
        } else {
            addFiles(deps[i].src);
        }
    }

    console.log('');

    var files = [];

    for (var src in memo) {
        files.push('src/' + src);
    }

    return files;
}

var compsBase32 = util.env.leafletCustomBuild ? util.env.leafletCustomBuild : 'fvvvvvv';

gulp.task('buildLeaflet', function () {
    return gulp.src(getLeafletFiles(compsBase32).map(function (file) {
        return path.resolve(path.join(__dirname, '../../node_modules/leaflet/', file))
    }))
        .pipe(concat('leaflet-src.js'))
        .pipe(gulp.dest('node_modules/leaflet/dist/'));
});
