const express = require('express');
const expressHandlebars = require('express-handlebars');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.db');
const expressSession = require("express-session")
const multer = require("multer");
const session = require('express-session');
const bcrypt = require("bcryptjs");
var csrf = require('csurf')
const SQLiteStore = require("connect-sqlite3")(expressSession)

const MINIMUM_TEXT = 2
const saltRounds = 10;

db.run(`
  CREATE TABLE IF NOT EXISTS guestPost(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    postText TEXT
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS portfolioPost(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    postText TEXT,
    img text
  )
`)

db.run(`CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT
)`)

db.run(`CREATE TABLE IF NOT EXISTS contact(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link TEXT,
  text TEXT,
  class TEXT
)`)



app.engine("hbs", expressHandlebars({
    defaultLayout: 'main.hbs'
}))

app.use(express.static('public'));



const storage = multer.diskStorage({
  destination: './public/images',
  filename: function(request, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload =multer({
  storage: storage
}).single('imgInput');

function logBody(req, res, next) {
  console.dir(req.body)
  next()
}


app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(expressSession({
  secret: "fisodjfsdofjsdfsd",
  saveUninitialized: false,
  resave: false,
  store: new SQLiteStore({

  })
}))

const csrfProtection = csrf({cookie: false})
const parseForm = bodyParser.urlencoded({extended: false})


app.use(function(request, response, next){
  response.locals.isLoggedIn = request.session.isLoggedIn
  next()
})

app.get('/', function(request, response){
  response.render("startPage.hbs")
})


app.get('/Contact', csrfProtection, function(request, response){

  const contactQuery = "SELECT * FROM contact ORDER BY id";

  db.all(contactQuery, function(error, contact){
    if(error){
      console.log(error)
    }else{
      const model = {
        contact,
        csrfToken: request.csrfToken
      }
      console.log(contact)
      response.render("contactPage.hbs", model)
  
    }

  })

})

app.get('/editContact/:id', csrfProtection, function(request, response){

  const id = request.params.id
  console.log(id)
  selectPortQuery = "SELECT * FROM contact WHERE id==?"


  db.all(selectPortQuery, id, function(error, contact){
    if(error){
      console.log(error)
    }else{
      const model = {
        contact,
        csrfToken: request.csrfToken
      }
      console.log(model)
      response.render("updateContact.hbs", model)
    }
});
})



app.post('/Contact', csrfProtection, parseForm, function(request, response){
  if(request.session.isLoggedIn){
    const text = request.body.textField
    const link = request.body.linkField
    const cssClass = request.body.classField
    const id = request.params.id
    const validationErrors = []
    if(text.length < MINIMUM_TEXT){
      validationErrors.push("Username/Email needs to be atleast " + MINIMUM_TEXT +" characters")
    }
    if(link.length < MINIMUM_TEXT){
      validationErrors.push("Link needs to be atleast " + MINIMUM_TEXT + " characters")
    }

    if(validationErrors.length){
      contactQuery = "SELECT * FROM contact"

    db.all(contactQuery, function(error, contact){
      if(error){
        console.log(error)
      }else{
        const model = {
          validationErrors,
          contact,
          csrfToken: request.csrfToken()
        }
        response.render("contactPage.hbs", model)
    
      }
  
    })
  }
  else{
    const newContactQuery = "INSERT INTO contact (link, text, class) VALUES (?, ?, ?)"
    const values = [link, text, cssClass];
    db.run(newContactQuery, values, function(error){
      if(error){
        console.log(error)
      }else{
        response.redirect('/Contact')
      }
    });
  
  }
  }else{
    response.redirect("/login")
  }
})



app.post('/editContact/:id', csrfProtection, parseForm, function(request, response){
  if(request.session.isLoggedIn){
    const text = request.body.textField
    const link = request.body.linkField
    const cssClass = request.body.classField
    const id = request.params.id
    const validationErrors = []
    if(text.length < MINIMUM_TEXT){
      validationErrors.push("Username/Email needs to be atleast " + MINIMUM_TEXT +" characters")
    }
    if(link.length < MINIMUM_TEXT){
      validationErrors.push("Link needs to be atleast " + MINIMUM_TEXT + " characters")
    }

    if(validationErrors.length){
      selectPortQuery = "SELECT * FROM contact WHERE id==?"

      db.all(selectPortQuery, id, function(error, contact){
        if(error){
          console.log(error)
        }else{
          const model = {
            validationErrors,
            contact,
            csrfToken: request.csrfToken()
          }
          console.log(model)
          response.render("updateContact.hbs", model)
        }
    });
    }else{
      const updateGuestQuery = "UPDATE contact SET text=?, link=?, class=? WHERE id=? "
      const values = [text, link, cssClass, id];
      console.log(values)
      db.run(updateGuestQuery, values, function(error){
        if(error){
          console.log(error)
        }else{
          response.redirect('/Contact')
        }
      })
    }
}else{
response.render("updateContact.hbs")
}
})


app.get('/Portfolio', csrfProtection, function(request, response){

  const portfolioQuery = "SELECT * FROM portfolioPost ORDER BY id";

  db.all(portfolioQuery, function(error, portfolioPost){
    if(error){
      console.log(error)
    }else{
      const model = {
        portfolioPost,
        csrfToken: request.csrfToken()
      }
      response.render("portfolioPage.hbs", model)
  
    }

  })

})






app.get('/editPortfolio/:id', csrfProtection, function(request, response){

  const id = request.params.id
  console.log(id)
  selectPortQuery = "SELECT * FROM portfolioPost WHERE id==?"


  db.all(selectPortQuery, id, function(error, portPost){
    if(error){
      console.log(error)
    }else{
      const model = {
        portPost,
        csrfToken: request.csrfToken
      }
      console.log(model)
      response.render("updatePortfolio.hbs", model)
    }
});
})


app.post('/editPortfolio/:id', csrfProtection, parseForm, function(request, response){
if(request.session.isLoggedIn){
  upload(request, response, function(error){
    if(error){
    }else{
      console.log(request.file)
      var image
      const validationErrors = []
      try{
        image = request.file.filename
      }catch(error){
        validationErrors.push("image invalid")
      }
      const title = request.body.title
      const textField = request.body.textField
      const id = request.params.id

      if(title.length < MINIMUM_TEXT){
        validationErrors.push("Title needs to be atleast " + MINIMUM_TEXT + " characters")
      }
      if(textField.length < MINIMUM_TEXT){
        validationErrors.push("Description needs to be atleast " + MINIMUM_TEXT + " characters")
      }
      if(validationErrors.length){
        selectPortQuery = "SELECT * FROM portfolioPost WHERE id==?"
        db.all(selectPortQuery, id, function(error, portPost){
          if(error){
            console.log(error)
          }else{
              const model = {
                validationErrors,
                portPost,
                csrfToken: request.csrfToken()
              }
              response.render("updatePortfolio.hbs", model)
          }
        })
      }else{
      const updatePostQuery = "UPDATE portfolioPost SET img=?, title=?, postText=? WHERE id=? "
      const values = [image, title, textField, id];
      db.run(updatePostQuery, values, function(error){
        if(error){
          console.log(error)
        }else{
          response.redirect('/Portfolio')
        }
      });
    }        
  }
  });
}else{
  response.render("updatePortfolio.hbs")
}
})








app.get('/editGuest/:id', csrfProtection, function(request, response){
  const id = request.params.id
  selectPortQuery = "SELECT * FROM guestPost WHERE id==?"

  db.all(selectPortQuery, id, function(error, guestPost){
    if(error){
      console.log(error)
    }else{
      const model = {
        guestPost,
        csrfToken: request.csrfToken
      }
      console.log(model)
      response.render("updateGuest.hbs", model)
    }
});
})

app.post('/editGuest/:id', csrfProtection, parseForm, function(request, response){
if(request.session.isLoggedIn){
      const title = request.body.title
      const postText = request.body.textField
      const id = request.params.id
      const validationErrors = []
      if(title.length < MINIMUM_TEXT){
        validationErrors.push("Name needs to be atleast " + MINIMUM_TEXT +" characters")
      }
      if(postText.length < MINIMUM_TEXT){
        validationErrors.push("Message needs to be atleast " + MINIMUM_TEXT + " characters")
      }

      if(validationErrors.length){
        selectPortQuery = "SELECT * FROM guestPost WHERE id==?"

        db.all(selectPortQuery, id, function(error, guestPost){
          if(error){
            console.log(error)
          }else{
            const model = {
              validationErrors,
              guestPost,
              csrfToken: request.csrfToken()
            }
            console.log(model)
            response.render("updateGuest.hbs", model)
          }
      });
      }else{
        const updateGuestQuery = "UPDATE guestPost SET title=?, postText=? WHERE id=? "
        const values = [title, postText, id];
        db.run(updateGuestQuery, values, function(error){
          if(error){
            console.log(error)
          }else{
            response.redirect('/Guestbook')
          }
        })
      }
}else{
  response.render("updateGuest.hbs")
}
})

app.post('/deleteGuest/:id', csrfProtection, parseForm, function(request, response){
  if(request.session.isLoggedIn){
    const id = request.params.id
    console.log(id)
    deleteGuestQuery = "DELETE FROM guestPost WHERE id==?"
  
  
    db.all(deleteGuestQuery, id, function(error){
      if(error){
        console.log(error)
      }
  });
  
  response.redirect("/Guestbook")
  }else{
    response.redirect("/login")
  }

})


app.post('/deleteContact/:id', csrfProtection, parseForm, function(request, response){
  if(request.session.isLoggedIn){
    const id = request.params.id
    console.log(id)
    deleteContactQuery = "DELETE FROM contact WHERE id==?"
  
  
    db.all(deleteContactQuery, id, function(error){
      if(error){
        console.log(error)
      }
  });
  
  response.redirect("/Contact")
  
  }else{
    response.redirect("/Login")
  }


})



app.post('/deletePortfolio/:id', csrfProtection, parseForm, function(request, response){
  if(request.session.isLoggedIn){
    const id = request.params.id
    console.log(id)
    deletePortQuery = "DELETE FROM portfolioPost WHERE id==?"
  
  
    db.all(deletePortQuery, id, function(error){
      if(error){
        console.log(error)
      }
  });
  
  response.redirect("/Portfolio")
  
  }else{
    response.redirect("/login")
  }


})


app.post('/Portfolio', csrfProtection, parseForm, function(request, response){
  if(request.session.isLoggedIn){
  upload(request, response, function(error){
    const title = request.body.title
    const textField = request.body.textField
    var image
    const validationErrors = []
    try{
      image = request.file.filename
    }catch(error){
      validationErrors.push("image invalid")
    }

  
    if(title.length < MINIMUM_TEXT){
        validationErrors.push("Title needs to be atleast " + MINIMUM_TEXT + " characters")
    }
  
    if(textField.length < MINIMUM_TEXT){
      validationErrors.push("Description needs to be atleast " + MINIMUM_TEXT + " characters")
    }
  
    if(validationErrors.length){
    const portfolioQuery = "SELECT * FROM portfolioPost ORDER BY id";

    db.all(portfolioQuery, function(error, portfolioPost){
      if(error){
        console.log(error)
      }else{
        const model = {
          validationErrors,
          title,
          textField,
          portfolioPost,
          csrfToken: request.csrfToken()
        }
        response.render("portfolioPage.hbs", model)
    
      }
  
    })

    }else{
    if(error){

    }else{
      console.log(request.file)    
      const newPostQuery = "INSERT INTO portfolioPost (title, postText, img) VALUES (?, ?, ?)"
      const values = [title, textField, image];
      db.run(newPostQuery, values, function(error){
        if(error){
          console.log(error)
        }else{
          response.redirect('/Portfolio')
        }
      });
    }
  }
  });
}else{
  response.redirect("/login")
}
})




app.get('/Guestbook', csrfProtection, function(request, response){

  const guestQuery = "SELECT * FROM guestPost ORDER BY id";

  db.all(guestQuery, function(error, guestPost){
    if(error){
      console.log(error)
    }else{
      const model = {
        guestPost,
        csrfToken: request.csrfToken
      }
      response.render("guestBookPage.hbs", model)
  
    }

  })

})

app.post('/Guestbook', csrfProtection, parseForm, function(request, response){
  const title = request.body.title
  const textField = request.body.textField

  const validationErrors = []

  if(title.length < MINIMUM_TEXT){
      validationErrors.push("Name needs to be atleast " + MINIMUM_TEXT + " characters")
  }

  if(textField.length < MINIMUM_TEXT){
    validationErrors.push("Message needs to be atleast " + MINIMUM_TEXT + " characters")
  }

  if(validationErrors.length){


    const guestQuery = "SELECT * FROM guestPost ORDER BY id";

    db.all(guestQuery, function(error, guestPost){
      if(error){
        console.log(error)
      }else{
        const model = {
          validationErrors,
          title,
          textField,
          guestPost,
          csrfToken: request.csrfToken()
        }
        response.render("guestBookPage.hbs", model)
    
      }
  
    })
  }
  else{
    const newPostQuery = "INSERT INTO guestPost (title, postText) VALUES (?, ?)"
    const values = [title, textField];
    db.run(newPostQuery, values, function(error){
      if(error){
        console.log(error)
      }else{
        response.redirect('/Guestbook')
      }
    });
  
  }
})



app.get('/Login', csrfProtection, function(request, response){
  response.render("login.hbs", {csrfToken: request.csrfToken})
})


app.get('/Logout', function(request, response){
  request.session.isLoggedIn = false
  response.redirect('/')
})

app.post('/Login', csrfProtection, parseForm, function(request, response){
  const enteredUsername = request.body.username
  const enteredPassword = request.body.password
  const validationErrors = []

if(enteredUsername && enteredPassword){
  const loginQuery = "SELECT * FROM users WHERE username==?"
  const values = [enteredUsername]

  db.all(loginQuery, values, function(error, users){

      console.log(users);
    if(users.length){
      if(bcrypt.compareSync(enteredPassword, users[0].password)){
          request.session.isLoggedIn = true;
          response.redirect("/")
    }else{
      console.log(users[0].password);
      console.log(enteredPassword)
      validationErrors.push("Wrong username/password")
      const model = {
        validationErrors,
        csrfToken: request.csrfToken()
      }
      response.render("login.hbs", model)
    }        
  }else{
    validationErrors.push("Wrong username/password")
    const model = {
      validationErrors,
      csrfToken: request.csrfToken()
    }
    response.render("login.hbs", model)
  }
  });
        
}else{
  validationErrors.push("Please enter something in both username and password")
  const model = {
    validationErrors,
    csrfToken: request.csrfToken()
  }
  response.render("login.hbs", model)
}
})



app.get('*', function(request, response){
  response.render("pageNotExist.hbs");
})



app.listen(3000);