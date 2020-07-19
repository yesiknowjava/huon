var toml = require("toml");
var S = require("string");

var CONTENT_PATH_PREFIX = "content";
// var CONTENT_PATH_PREFIX_ABOUT_US = "content/about-us";
// var CONTENT_PATH_PREFIX_SERVICES = "content/services";


const mozjpeg = require('imagemin-mozjpeg');

function getPosition(string, subString, index) {
    return string.split(subString, index).join(subString).length;
}

module.exports = function (grunt) {

    // Build offline search index

    grunt.registerTask("lunr-index", function () {

        grunt.log.writeln("Build pages index");

        var indexPages = function () {
            var pagesIndex = [];
            grunt.file.recurse(CONTENT_PATH_PREFIX, function (abspath, rootdir, subdir, filename) {
                if (abspath !== "content/search/_index.md") {
                    grunt.verbose.writeln("Parse file:", abspath);
                    pagesIndex.push(processFile(abspath, filename));
                }
            });

            return pagesIndex;
        };

        var processFile = function (abspath, filename) {
            var pageIndex;


            if (S(filename).endsWith(".html")) {
                pageIndex = processHTMLFile(abspath, filename);
            } else {
                //pageIndex = processMDFile(abspath, filename);
            }

            return pageIndex;
        };

        var processHTMLFile = function (abspath, filename) {
            var content = grunt.file.read(abspath);
            content = content.slice(getPosition(content, '---', 2), content.length);
            var pageName = S(filename).chompRight(".html").s;
            var href = S(abspath)
            .chompLeft(CONTENT_PATH_PREFIX).chompRight(".html").s;
            // href = href.slice(3, href.length)
            return {
                
                title: pageName,
                href: href,
                content: S(content).trim().stripTags().stripPunctuation().s
            };
        };

        var processMDFile = function (abspath, filename) {
            
            var content = grunt.file.read(abspath);
            var pageIndex;
            // First separate the Front Matter from the content and parse it
            content = content.split("+++");
            var frontMatter;
            if (content.length) {
                try {
                    frontMatter = toml.parse(content[1].trim());
                } catch (e) {
                    console.log(e.message);
                    // console.log("this is the error")
                }
            }
            
            

            var href = S(abspath).chompLeft(CONTENT_PATH_PREFIX).chompRight(".md").s;
            // href for index.md files stops at the folder name
            if (filename === "_index.md") {
                href = S(abspath).chompLeft(CONTENT_PATH_PREFIX).chompRight(filename).s;
            }


            var stripPunc = /([^\x00-\x7F]|\w)+/
            // Build Lunr index for this page
            if (frontMatter) {
                console.log(abspath+filename)
                pageIndex = {
                    title: frontMatter.title,
                    tags: frontMatter.tags,
                    href: href,
                    content: S(content[2]).trim().stripTags().replace(stripPunc, '').replace(/\s+/g, ' ').s
                };
    
                return pageIndex;
            } 
            
        };
        //console.log(JSON.stringify(indexPages()))
        grunt.file.write("static/js/lunr/PagesIndex.json", JSON.stringify(indexPages()));
        grunt.log.ok("Index built");
    });



    // Optimise images

    grunt.initConfig({
        imagemin: {
            static: {
                options: {
                    optimizationLevel: 3,
                    svgoPlugins: [{
                        removeViewBox: false
                    }],
                    use: [mozjpeg()] // Example plugin usage
                },
                files: {

                }
            },
            dynamic: {
                files: [{
                    expand: true,
                    cwd: 'themes/art/static/img/',
                    src: ['**/*.{png,jpg,jpeg,gif}'],
                    dest: 'themes/art/static/img/'
                }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.registerTask('default', ['imagemin'], ['lunr-index']);
};