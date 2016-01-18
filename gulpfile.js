// including plugins
var gulp = require('gulp')
, minifyCss = require("gulp-minify-css")
, uglify = require("gulp-uglify")
, concat = require("gulp-concat")
, deploy = require('gulp-gh-pages');
 

// task for js
gulp.task('dist', function () {
    gulp.src(['./assets/lib/libtiff/tiff.min.js', './assets/lib/pdfjs/pdf.compat.js', './assets/lib/pdfjs/pdf.js','./src/FormatReader.js','./src/CanvasViewer.js']) 
    .pipe(uglify())
    .pipe(concat('CanvasViewer.all.min.js'))
    .pipe(gulp.dest('./dist'));

    gulp.src(['./src/FormatReader.js','./src/CanvasViewer.js']) 
    .pipe(uglify())
    .pipe(concat('CanvasViewer.min.js'))
    .pipe(gulp.dest('./dist'));

    gulp.src(['./assets/lib/libtiff/tiff.min.js']) 
    .pipe(uglify())
    .pipe(concat('CanvasViewer.tiff.min.js'))
    .pipe(gulp.dest('./dist'));

    gulp.src(['./assets/lib/pdfjs/pdf.compat.js', './assets/lib/pdfjs/pdf.js']) 
    .pipe(uglify())
    .pipe(concat('CanvasViewer.pdf.min.js'))
    .pipe(gulp.dest('./dist'));

    gulp.src(['./assets/lib/pdfjs/pdf.worker.js']) 
    .pipe(uglify())
    .pipe(concat('CanvasViewer.min.worker.js'))
    .pipe(gulp.dest('./dist'));

    gulp.src(['./assets/lib/pdfjs/pdf.worker.js']) 
    .pipe(uglify())
    .pipe(concat('CanvasViewer.all.min.worker.js'))
    .pipe(gulp.dest('./dist'));

    gulp.src(['./src/CanvasViewer.css']) 
    .pipe(minifyCss())
    .pipe(concat('CanvasViewer.min.css'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('deploy', function() {

    gulp.src(['./app/app.modules.js','./app/controller/app.controller.js']) 
    .pipe(uglify())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest('./gh-pages/app/'));

    gulp.src(['./assets/lib/angular/angular.min.js','assets/lib/json-formatter/dist/json-formatter.min.js']) 
    .pipe(uglify())
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest('./gh-pages/assets/lib/'));

    gulp.src(['./assets/css/style.css','assets/lib/json-formatter/dist/json-formatter.min.css']) 
    .pipe(minifyCss())
    .pipe(concat('style.min.css'))
    .pipe(gulp.dest('./gh-pages/assets/css'));

   // Directive delivrery
   gulp.src(['./dist/*.*'])
   .pipe(gulp.dest('./gh-pages/dist'));    

   // Bootstrap
   gulp.src(['./assets/lib/bootstrap/dist/css/bootstrap.min.css', './assets/lib/bootstrap/dist/css/bootstrap-theme.min.css'])
   .pipe(gulp.dest('./gh-pages/assets/css'));    

   gulp.src('./assets/lib/bootstrap/dist/fonts/**/*.{ttf,woff,woff2,eof,svg}')
   .pipe(gulp.dest('./gh-pages/assets/fonts'));    

   // fontawesome
   gulp.src('./assets/lib/font-awesome/css/font-awesome.min.css')
   .pipe(gulp.dest('./gh-pages/assets/css'));    

   gulp.src('./assets/lib/font-awesome/fonts/**/*.{ttf,woff,woff2,eof,svg}')
   .pipe(gulp.dest('./gh-pages/assets/fonts'));    

   // Images
   gulp.src('./assets/img/billet_specimen_securite2.jpg')
   .pipe(gulp.dest('./gh-pages/assets/img'));    

   return gulp.src(['./gh-pages/**/*'])
    .pipe(deploy());
});
