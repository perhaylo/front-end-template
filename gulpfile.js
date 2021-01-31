const gulp = require("gulp"),
  browserSync = require("browser-sync").create(),
  watch = require("gulp-watch"),
  cache = require("gulp-cache"),
  rename = require("gulp-rename"),
  del = require("del");

// HTML
const htmlmin = require("gulp-htmlmin"),
  removeEmptyLines = require("gulp-remove-empty-lines"),
  htmlhint = require("gulp-htmlhint");

// Styles
const sass = require("gulp-sass"),
  sourcemaps = require("gulp-sourcemaps"),
  gcmq = require("gulp-group-css-media-queries"),
  plumber = require("gulp-plumber"),
  postcss = require("gulp-postcss"),
  csso = require("postcss-csso"),
  sassGlob = require("gulp-sass-glob"),
  postcssFallback = require("postcss-color-rgba-fallback"),
  postcssFlexBugsFixes = require("postcss-flexbugs-fixes"),
  autoprefixer = require("autoprefixer"),
  cssnano = require("cssnano");

// JS
const webpack = require("webpack-stream"),
  compiler = require("webpack");

// Images
const imagemin = require("gulp-imagemin"),
  svgstore = require("gulp-svgstore"),
  mozjpeg = require("imagemin-mozjpeg"),
  webp = require("gulp-webp"),
  pngquant = require("imagemin-pngquant");


let isDev = true;
let isProd = !isDev;

const path = {
  dist: {
    base: "./dist",
    style: "./dist/css",
    js: "./dist/js",
    img: "./dist/img",
    fonts: "./dist/fonts"
  },
  src: {
    base: "./src",
    html: "./src/**/*.html",
    style: "./src/scss/style.scss",
    js: "./src/js/index.js",
    webp: "./src/img/**/*.+(png|jpg|jpeg)",
    svg: "./src/img/**/icon-*.svg",
    img: "./src/img/**/*.+(png|jpg|jpeg|svg|gif)",
    fonts: "./src/fonts/**/*.+(woff|woff2|ttf|eot)"
  },
  watch: {
    html: "./src/*.html",
    js: "./src/js/**/*.js",
    style: "./src/scss/**/*.scss"
  }
};

const startTasks = [
  "clean",
  "html",
  "sass",
  "js",
  "images",
  "copy",
  "fonts"
];

const watchTasks = [
  "browserSync",
  "watch"
];

const webpackConfig = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "inline-source-map" : "none",
  output: {
    filename: "main.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: "/node_modules/",
        loader: "babel-loader"
      }
    ]
  }
};

// Server connect
gulp.task("browserSync", function () {
  browserSync.init({
    server: path.dist.base,
    injectChanges: true,
    notify: false,
    open: false
  });
});

gulp.task("cache", function () {
  return cache.clearAll();
});

gulp.task("clean", gulp.series("cache", function () {
  return del([
    path.dist.base
  ], { force: true });
}));

// html
gulp.task("html", function () {
  return gulp.src(path.src.html)
    .pipe(htmlhint(".htmlhintrc"))
    .pipe(htmlhint.reporter())
    .pipe(removeEmptyLines())
    .pipe(htmlmin({
      sortClassName: true,
      sortAttributes: true,
      caseSensitive: true,
      removeComments: true,
      collapseWhitespace: true
    }))
    .pipe(gulp.dest(path.dist.base))
    .pipe(browserSync.reload({ stream: true }));
});

// sass
gulp.task("sass", function () {
  const plugins = [
    postcssFlexBugsFixes(),
    postcssFallback(),
    autoprefixer({
      cascade: false
    }),
    cssnano(),
    csso()
  ];

  return gulp.src(path.src.style)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass.sync({
      outputStyle: "expanded"
    }).on("error", sass.logError))
    .pipe(gcmq())
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.dist.style))
    .pipe(browserSync.reload({ stream: true }));
});

// js
gulp.task("js", function () {
  return gulp.src(path.src.js)
    .pipe(webpack(webpackConfig, compiler))
    .pipe(gulp.dest(path.dist.js))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task("img", function () {
  return gulp.src(path.src.img)
    .pipe(imagemin([
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.mozjpeg({ progressive: true }),
      imagemin.gifsicle({ interlaced: true }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: false },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(gulp.dest(path.dist.img));
});

gulp.task("webp", function () {
  return gulp.src(path.src.webp)
    .pipe(webp({ quality: 90 }))
    .pipe(gulp.dest(path.dist.img));
});

gulp.task("svg", function () {
  return gulp.src(path.src.svg)
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest(path.dist.img));
});

gulp.task("images", gulp.series("img", "webp"), function () {
  return gulp.src("./dist/img/**/*.+(jpg|jpeg|png)")
    .pipe(imagemin([
      mozjpeg({ quality: 85 }),
      pngquant({ quality: [0.8, 0.9] })
    ]))
    .pipe(gulp.dest(path.dist.img));
});

// fonts
gulp.task("fonts", function () {
  return gulp.src(path.src.fonts)
    .pipe(gulp.dest(path.dist.fonts));
});

gulp.task("copy", function () {
  return gulp.src([
    `${path.src.base}/*.*`,
    `!${path.src.base}/*.html`
  ], {
    base: path.src.base
  })
    .pipe(gulp.dest(path.dist.base));
});

// watch
gulp.task("watch", function () {
  gulp.watch([`${path.src.base}/*.*`, `!${path.src.base}/*.html`],
    gulp.series("copy"));

  gulp.watch(path.watch.html,
    gulp.series("html"));

  gulp.watch(path.watch.js,
    gulp.series("js"));

  gulp.watch(path.watch.style,
    gulp.series("sass"));
});

gulp.task("default", gulp.series(startTasks, gulp.parallel(watchTasks)));
