const express = require('express');
const expressHandlebars = require('express-handlebars');
const path = require('path');
const app = express();

app.engine("hbs", expressHandlebars({
    defaultLayout: 'main.hbs'
}))

app.use(express.static(path.join('public')));

app.get('/', function(request, response){
  response.render("startPage.hbs")
})


app.listen(8080);