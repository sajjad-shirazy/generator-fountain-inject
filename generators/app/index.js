'use strict';

const fountain = require('fountain-generator');
const path = require('path');

module.exports = fountain.Base.extend({
  prompting() {
    this.options.modules = 'inject';
    this.fountainPrompting();
  },

  configuring: {
    pkg() {
      let dependencies;
      let devDependencies = {};

      this.updateJson('package.json', function (packageJson) {
        dependencies = packageJson.dependencies;
        delete packageJson.dependencies;
        return packageJson;
      });

      const pkg = {
        devDependencies: {
          'gulp-inject': '^3.0.0',
          'main-bower-files': '^2.9.0',
          wiredep: '^2.2.2'
        }
      };

      if (this.props.framework === 'angular1') {
        pkg.devDependencies['gulp-angular-filesort'] = '^1.1.1';
      }

      if (this.props.js === 'babel' || this.props.js === 'js' && this.props.framework === 'react') {
        pkg.devDependencies['gulp-babel'] = '^6.1.0';
      }

      if (this.props.js === 'typescript') {
        pkg.devDependencies['gulp-typescript'] = '^2.10.0';
      }

      this.mergeJson('package.json', pkg);

      if (this.props.framework === 'react') {
        delete dependencies['react-dom'];
      }

      if (this.props.framework === 'angular1') {
        devDependencies['angular-mocks'] = dependencies.angular;
      }

      this.mergeJson('bower.json', {
        name: 'fountain-inject',
        version: '0.0.1',
        dependencies: dependencies,
        devDependencies: devDependencies
      });
    }
  },

  writing: {
    transforms() {
      this.replaceInFiles('src/**/*.js', (content, fileName) => {
        const baseName = path.basename(fileName, '.js');
        const componentName = baseName.substr(0, 1).toUpperCase() + baseName.substr(1);
        // remove es2015 imports
        let result = content.replace(/import .*\n\n?/g, '');
        // remove commonjs requires
        result = result.replace(/.*require\(.*\);\n\n?/g, '');
        // remove exports of es2015 React components
        result = result.replace(
          /export class ([^\s]*) extends Component/g,
          'class $1 extends React.Component'
        );
        // remove exports of createClass React components
        result = result.replace(
          /module\.exports = React\.createClass/,
          `window.${componentName} = React.createClass`
        );
        // rename styles var for React inline style
        result = result.replace(
          /(var|const) styles =/g,
          `$1 ${componentName}Styles =`
        );
        result = result.replace(
          /style={styles\.(.*)}/g,
          `style={${componentName}Styles.$1}`
        );
        return result;
      });
    },

    gulp() {
      this.copyTemplate(
        this.templatePath('gulp_tasks'),
        this.destinationPath('gulp_tasks'),
        { css: this.props.css }
      );
    },

    indexHtml() {
      this.replaceInFileWithTemplate(
        'src/index-head.html',
        'src/index.html',
        /<\/head>/
      );
      this.replaceInFileWithTemplate(
        'src/index-footer.html',
        'src/index.html',
        /<\/html>/
      );
    }
  },

  installing() {
    this.bowerInstall();
  }
});
