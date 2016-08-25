var concat = require('gulp-concat');
var gulp = require('gulp');
var util = require('gulp-util');

var config = require('../../app/config.js');
var deps = require('../deps')(config);

var removedFiles = util.env.removeFromLeaflet ? util.env.removeFromLeaflet.split(',') : [];

gulp.task('buildLeaflet', function () {
    return gulp.src(deps.getJSFiles({source: 'leaflet'}).filter(function (item) {
        return removedFiles.indexOf(item.split('/').pop()) === -1;
    }))
        .pipe(concat('leaflet-src.js'))
        .pipe(gulp.dest('node_modules/leaflet/dist/'));
});
