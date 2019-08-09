const gulp = require('gulp');
const { development, production} = require('gulp-environments');
const rimraf = require('rimraf');

const panini = require('panini');
const minifyHtml = require('gulp-minify-html');

const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const cssnano = require('gulp-cssnano');
const postcss = require('gulp-postcss');
const autoprefixer = require('gulp-autoprefixer');

const concat = require('gulp-concat');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');

const path = require('path');
const rename = require("gulp-rename");
let distPath = 'dist';
let nodeModulesPath = 'node_modules';

const browserSync = require('browser-sync');
let port = process.env.SERVER_PORT || 6080;

gulp.task('clean', function(cb) {
    rimraf(distPath, cb);
});

gulp.task('compile-app-scss', function () {
    let sassOptions = {
        errLogToConsole: true,
        outputStyle: 'expanded',
        includePaths: path.join(nodeModulesPath,'bootstrap', 'scss')
    }
    // let postPlugins = [autoprefixer({browsers: ['last 1 version']}), cssnano()];
    return gulp.src('src/global/scss/app.scss')
        .pipe(development(sourcemaps.init()))
        .pipe(sass(sassOptions).on('error', sass.logError))
        // .pipe(postcss(postPlugins))
        // .pipe(autoprefixer())
        .pipe(production(cssnano()))
        .pipe(development(sourcemaps.write()))
        .pipe(gulp.dest(path.join(distPath, 'css')));        
});

gulp.task('compile-app-js', function(){
    let jqueryPath = path.join(nodeModulesPath,'jquery', 'dist', 'jquery.min.js');
    let popperPath = path.join(nodeModulesPath,'popper.js', 'dist', 'umd', 'popper.min.js');
    let bootstrapPath = path.join(nodeModulesPath,'bootstrap', 'dist','js', 'bootstrap.min.js');
    return gulp.src([jqueryPath, popperPath, bootstrapPath])
        .pipe(concat('app.js'))
        .pipe(gulp.dest(path.join(distPath, 'js')));
})

gulp.task('compile-page-scss', function(){
    return gulp.src('src/pages/**/*.scss')
        .pipe(development(sourcemaps.init()))
        .pipe(sass().on('error', sass.logError))
        // .pipe(autoprefixer())
        .pipe(production(cssnano()))
        .pipe(development(sourcemaps.write()))
        .pipe(rename(function(tempPath){
            tempPath.dirname = './';
        }))
        .pipe(gulp.dest(path.join(distPath, 'css')));
})

gulp.task('compile-page-js', function(){
    let commonJsPath = path.join('src', 'global', 'js', 'common.js');
    return gulp.src(['src/pages/**/*.js', commonJsPath])
    .pipe(
        production(
            babel({presets: ['@babel/env']})
        )
    )
    .pipe(production(uglify()))
    .pipe(rename(function(tempPath){
        tempPath.dirname = './';
    }))
    .pipe(gulp.dest(path.join(distPath, 'js')));
})

gulp.task('compile-html', function(){
    let paniniOption = {
        root: 'src/pages/',
        layouts: 'src/layouts/',
        partials: 'src/partials/',
        helpers: 'src/helpers/',
        data: 'src/data/'
    }
    return gulp.src('src/pages/**/*.html')
        .pipe(panini(paniniOption))
        .pipe(production(minifyHtml()))
        .pipe(rename(function(tempPath){
            tempPath.dirname = './';
        }))
        .pipe(gulp.dest(distPath));
})

gulp.task('copy', function() {
    return gulp.src(['src/assets/**/*']).
        pipe(gulp.dest(path.join(distPath, 'assets')));
});

gulp.task('server', function(){
    browserSync.init({
        server: distPath,
        port: port
    });
});

gulp.task('build', gulp.series('clean', gulp.series('copy','compile-app-scss','compile-app-js', 'compile-page-scss', 'compile-page-js','compile-html')));

gulp.task('watch', function() {
    gulp.watch('src/global/scss/**/*.scss').on('change', gulp.series('compile-app-scss', browserSync.reload));
    gulp.watch('src/pages/**/*.scss').on('change', gulp.series('compile-page-scss', browserSync.reload));
    gulp.watch('src/global/js/**/*.js').on('change', gulp.series('compile-page-js', browserSync.reload));
    gulp.watch('src/pages/**/*.js').on('change', gulp.series('compile-page-js', browserSync.reload));
    gulp.watch('src/{layouts,partials,helpers,data}/**/*.html').on('change', gulp.series(async () => { await panini.refresh() }, 'compile-html', browserSync.reload));
    gulp.watch('src/pages/**/*.html').on('change', gulp.series('compile-html', browserSync.reload));
});

gulp.task('set-production', function(cb){
    production.task();
    console.log(production() ? "set-production success." : "set-production failed.")
    cb();
});
gulp.task('set-development', function(cb){
    development.task();
    console.log(development() ? "set-development success." : "set-development failed.")
    cb();
});
gulp.task('deploy', gulp.series('set-production', 'build', gulp.parallel('server', 'watch')));
gulp.task('default', gulp.series('set-development','build', gulp.parallel('server', 'watch')));

gulp.task('test', gulp.series('clean', 'set-development', 'compile-html'))