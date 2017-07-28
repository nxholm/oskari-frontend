# ES6 SUPPORT FOR OSKARI

## SETUP:  

``` bash
# install dependencies
npm i

# bundle the project files defined in /build/webpack.base.conf.js (production)
npm run build

# hot module loading, not currently supported, but may be possible to use webpack dev server as reverse proxy in jetty
npm run dev
```

## steps:

In jetty folder __contexts/oskari-front.xml__ point to this project.

In app root run:
`npm run build`  
to create a minified version of oskari to __/dist/static/js/__

In __oskari-server/servlet-map/src/main/resources/META-INF/resources/spring-map-jsp/index.jsp__ change the Oskari section:  

``` javascript
<script type="text/javascript"
        src="/Oskari/dist/static/js/oskaricore.js">
</script>
<script type="text/javascript"
        src="/Oskari/dist/static/js/oskaripackages.js">
</script>
```
to use the es6 enabled oskari.

Build server (mvn clean install), get the .war-file __oskari-server/webapp-map/oskari.map.war__ and move it to __jetty/webapps__ and start jetty.