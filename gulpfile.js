const gulp = require("gulp"),
  sass = require("gulp-sass"),
  browserSync = require("browser-sync").create(),
  imagemin = require("gulp-imagemin"),
  htmlmin = require("gulp-htmlmin"),
  removeEmptyLines = require("gulp-remove-empty-lines"),
  del = require("del"),
  sourcemaps = require("gulp-sourcemaps"),
  cache = require("gulp-cache"),
  gcmq = require("gulp-group-css-media-queries"),
  plumber = require("gulp-plumber"),
  rename = require("gulp-rename"),
  htmlhint = require("gulp-htmlhint"),
  postcss = require("gulp-postcss"),
  csso = require("postcss-csso"),
  sassGlob = require("gulp-sass-glob"),
  postcssFallback = require("postcss-color-rgba-fallback"),
  postcssFlexBugsFixes = require("postcss-flexbugs-fixes"),
  autoprefixer = require("autoprefixer"),
  svgstore = require("gulp-svgstore"),
  mozjpeg = require("imagemin-mozjpeg"),
  webp = require("gulp-webp"),
  pngquant = require("imagemin-pngquant"),
  cssnano = require("cssnano"),
  watch = require("gulp-watch"),
  webpack = require("webpack-stream"),
  compiler = require("webpack");

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

gulp.task("clean", ["cache"], function () {
  del.sync([
    path.dist.base
  ], { force: true });
});

gulp.task("cache", function () {
  return cache.clearAll();
});

gulp.task("default", ["clean", "html", "sass", "js", "image", "fonts"],
  function () {
    gulp.start("watch");
  });

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
    .pipe(gulp.dest(path.dist.base));
});

// sass
gulp.task("sass", function () {
  const plugins = [
    postcssFlexBugsFixes(),
    postcssFallback(),
    autoprefixer({
      browsers: ["last 2 versions"],
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
    .pipe(gulp.dest(path.dist.style));
});

// js
gulp.task("js", function () {
  return gulp.src(path.src.js)
    .pipe(webpack(webpackConfig, compiler))
    .pipe(gulp.dest(path.dist.js));
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

gulp.task("image", ["img"], function () {
  return gulp.src("./dist/img/**/*.+(jpg|jpeg|png)")
    .pipe(imagemin([
      mozjpeg({ quality: 85 }),
      pngquant({ quality: [0.8, 0.9] })
    ]))
    .pipe(gulp.dest(path.dist.img));
});

gulp.task("img", ["webp"], function () {
  return gulp.src(path.src.img)
    .pipe(imagemin([
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.jpegtran({ progressive: true }),
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

// fonts
gulp.task("fonts", function () {
  return gulp.src(path.src.fonts)
    .pipe(gulp.dest(path.dist.fonts));
});

gulp.task("copy", ["fonts"], function () {
  return gulp.src([
    "!./src/*.html",
    "./src/*.*"
  ], {
      base: path.src.base
    })
    .pipe(gulp.dest(path.dist.base));
});

// watch
gulp.task("watch", ["browserSync"], function () {
  watch(path.watch.html, function () {
    gulp.start("html");
    browserSync.reload();
  });

  watch(path.watch.js, function () {
    gulp.start("js");
    browserSync.reload();
  });

  watch(path.watch.style, function () {
    setTimeout(function () {
      gulp.start("sass");
      browserSync.reload();
    }, 100);
  });
});
