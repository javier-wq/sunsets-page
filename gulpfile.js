import path from 'path';
import fs from 'fs';
import { globSync } from 'glob';
import { src, dest, watch, series } from 'gulp';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import terser from 'gulp-terser';
import sharp from 'sharp';

const sass = gulpSass(dartSass);

export function js(done) {
    src('src/js/app.js')
    .pipe(terser())
    .pipe(dest('build/js'))
    done();
}

export function css(done) {
    src('src/scss/app.scss', { sourcemaps: true })
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(dest('build/css', { sourcemaps: '.' }))
    done();
}

export async function crop(done) {
    const inputFolder = 'src/assets/img/full';
    const outputFolder = 'src/assets/img/thumb';
    const width = 250;
    const height = 180;

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }

    const images = fs.readdirSync(inputFolder).filter(file => {
        return /\.(jpg)$/i.test(path.extname(file));
    });

    try {
        for (const file of images) {
            const inputFile = path.join(inputFolder, file);
            const outputFile = path.join(outputFolder, file);

            await sharp(inputFile)
                .resize(width, height, { position: 'center' })
                .toFile(outputFile);
        }
        done();
    } catch (error) {
        console.log("Error en crop:", error);
        done(error);
    }
}

export function imagenes(done) {
    const srcDir = './src/assets';
    const buildDir = './build/img';
    const images = globSync('./src/assets/**/*.{jpg,png}');

    images.forEach(file => {
        const relativePath = path.relative(srcDir, path.dirname(file));
        const outputSubDir = path.join(buildDir, relativePath);
        procesarImagenes(file, outputSubDir);
    });
    done();
}

function procesarImagenes(file, outputSubDir) {
    if (!fs.existsSync(outputSubDir)) {
        fs.mkdirSync(outputSubDir, { recursive: true });
    }
    const baseName = path.basename(file, path.extname(file));
    const extName = path.extname(file);
    const outputFile = path.join(outputSubDir, `${baseName}${extName}`);
    const outputFileWebp = path.join(outputSubDir, `${baseName}.webp`);

    const options = { quality: 80 };
    sharp(file)
        .jpeg(options)
        .toFile(outputFile)
        .catch(err => console.log(`Error al procesar ${file}:`, err));
    sharp(file)
        .webp(options)
        .toFile(outputFileWebp)
        .catch(err => console.log(`Error al procesar ${file} a WebP:`, err));
}

export function dev() {
    watch('src/scss/**/*.scss', css);
    watch('src/js/**/*.js', js);
    watch('src/assets/**/*.{png,jpg}', imagenes);
}

export default series(crop, js, css, imagenes, dev);
