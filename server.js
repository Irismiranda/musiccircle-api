const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const axios = require('axios')
const functions = require('firebase-functions')
const socketIo = require('socket.io')
const querystring = require('querystring')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs')

const port = process.env.PORT
const app = express()

dotenv.config()

app.use(cors({
  origin: 'https://musiccircle.onrender.com', 
  credentials: true
}))

app.use(express.json())

const server = app.listen(4000, function(){
  console.log('listening for requests on port 4000,')
})

const io = socketIo(server, {
  cors: {
    origin: 'https://musiccircle.onrender.com', 
    credentials: true
  },
})

  //Spotify Authentication

  const spotify_client_id = process.env.SPOTIFY_CLIENT_ID
  const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET

  app.get('/auth/login', (req, res) => {
    const scope = 'streaming user-read-email user-follow-modify user-follow-read user-top-read user-read-recently-played user-read-currently-playing user-read-playback-state user-read-playback-position user-modify-playback-state user-read-private user-library-read user-library-modify user-read-private'

    const state = uuidv4()

    const auth_query_parameters = new URLSearchParams({
      response_type: 'code',
      client_id: spotify_client_id,
      scope: scope,
      redirect_uri: 'https://musiccircle-api.onrender.com/auth/callback',
      state: state,
    })

    res.send(
      `https://accounts.spotify.com/authorize/?${auth_query_parameters.toString()}`
    )
  })

  app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query

    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('redirect_uri', 'https://musiccircle-api.onrender.com/auth/callback')
    params.append('client_secret', spotify_client_secret)

    const headers = {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        new Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
    }

    const response = await axios.default.post(
      'https://accounts.spotify.com/api/token',
      params,
      {
        headers: headers,
      }
    )
    const {access_token, refresh_token, expires_in} = response.data
    console.log("log - refresh token is:", refresh_token)
    res.redirect(`https://musiccircle.onrender.com?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`)
  })

  app.post('/auth/refresh_token', async (req, res) => {
    const { refresh_token } = req.body
    try {
      const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${spotify_client_id}:${spotify_client_secret}`).toString('base64')}`
        },
      })
      console.log("token refreshed")
      res.json(response.data)
      
    } catch (error) {
      console.log("failed to refreshed token", error)
      console.error('Error refreshing access token:', error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  // Emoji API

  const emoji_api_key = process.env.EMOJI_API_KEY

  app.post('/api/emoji_category', async (req, res) => {
    const { category } = req.body
    try {
      const response = await axios({
        method: 'get',
        url: `https://emoji-api.com/categories/${category}?access_key=${emoji_api_key}`,
      })
      res.json(response.data)
    } catch (err) {
      console.log(err)
    }
  })

  app.post('/api/search_emojis', async (req, res) => {
    const { search_term } = req.body
    try {
      const response = await axios({
        method: 'get',
        url: `https://emoji-api.com/emojis?search=${search_term}&access_key=${emoji_api_key}`,
      })
      res.json(response.data)
    } catch(err) {

    }
  })

  // Firestore 

  // User data

  app.post('/api/profile', async (req, res) => {
    const { userData } = req.body
    const { id, type } = userData

    try {
      const userDocRef = admin.firestore().doc(`${type}/${id}`)
      const existingUserDoc = await userDocRef.get()

      if (existingUserDoc.exists) {
          console.log("log -", existingUserDoc.data())
          res.json(existingUserDoc.data())
        } else {  
          await userDocRef.set({userData})
          res.json(userData)
        }
      } catch(err){
        console.log(err)
      }
  })

  app.post('/api/profile/following', async (req, res) => {
    const { currentUser } = req.body
    console.log("Log - current user is:", currentUser)
    const { id, type } = currentUser


    try {
      const followingCollectionRef = admin.firestore().collection(`${type}/${id}/following`)
      const userFollowingCollection = await followingCollectionRef.get()

      if (userFollowingCollection.empty) {
          res.json(null)
        } else {  
          res.json(userFollowingCollection.data)
        }
      } catch(err){
        console.log(err)
      }
  })
  
  //Chats

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://<your-database-name>.firebaseio.com',
  })

  const db = admin.firestore()

  io.on('connection', (socket) => {
    console.log('Client connected')
    
    socket.on('connectToChat', async ({ id, type }) => {
      try {
        const chatCollectionRef = admin.firestore().collection(`${type}/${id}/chats`)
        const existingChatQuery = await chatCollectionRef.get()

        let currentChatId = ''

        if (existingChatQuery.size > 0) {
          existingChatQuery.forEach((doc) => {
            currentChatId = doc.id
          })
          console.log('Found existing chat:', currentChatId)
          } else {
            const newChatId = `${id}_${uuidv4()}`
            console.log('New chat id is:', newChatId)
      
            await chatCollectionRef.doc(newChatId).set({})

            currentChatId = newChatId
            console.log('New chat created', currentChatId)
          }

          let isFirstSnapshot = true

          console.log("is this the first snapshot?:", isFirstSnapshot)

          const messagesRef = admin.firestore().collection(`${type}/${id}/chats/${currentChatId}/messages`)
          console.log("messages ref is:", `${type}/${id}/chats/${currentChatId}/messages`)
          messagesRef.onSnapshot((snapshot) => {
          const messages = []
          
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const newMessage = change.doc.data()
              console.log('New message is:', newMessage)
              messages.push(newMessage)
            }   
          })

          if(isFirstSnapshot){
            console.log("is this the first snapshot?:", isFirstSnapshot)
            io.to(currentChatId).emit('loadAllMessages', messages)
            console.log('all messages loaded:', messages)
            isFirstSnapshot = false
          } else {
            console.log("is this the first snapshot?:", isFirstSnapshot)
            io.to(currentChatId).emit('loadNewMessage', messages)
            console.log('new message loaded:', messages)
          }
        })

        socket.join(currentChatId)
        console.log('User connected to chat', currentChatId)
        socket.emit('gotChat', currentChatId)
      } catch (error) {
        console.error('Error creating/updating chat:', error)
      }
      
    })

    socket.on('sendMessage', async ( newMessage ) => {
      console.log('new message data is:', newMessage)

      const { messageId, id, chatId } = newMessage
      const docRef = admin.firestore().collection(`artists/${id}/chats/${chatId}/messages`).doc(messageId)

      try {
        await docRef.set(newMessage)
        console.log('Message added to Firestore:', newMessage)

        const messagesSnapshot = await messagesRef.get()
        if (messagesSnapshot.size > 100) {

          const messagesToDelete = messagesSnapshot.size - 100
          const batch = admin.firestore().batch()
          messagesSnapshot.docs.slice(0, messagesToDelete).forEach(doc => {
            batch.delete(doc.ref)
          })
          await batch.commit()
          console.log(`Deleted ${messagesToDelete} old message(s) to maintain limit.`);
        }
      } catch (error) {
        console.error('Error adding message to Firestore:', error)
      }
    })

    socket.on('removeMessage', async ({ id, chatId, messageId }) => {
      const messageRef =  admin.firestore().doc(`artists/${id}/chats/${chatId}/messages/${messageId}`)
      try {
          await messageRef.update({
              display: false
          })
          console.log('Message display status updated successfully.')
        } catch (error) {
            console.error('Error updating message display status:', error)
        }
    })

    socket.on('leaveChat', ({ chatId }) => {
      socket.leave(chatId)
      console.log('Disconnecting from chat:', chatId)
    })
  })

//Instagram connect

const ig_client_id = process.env.IG_CLIENT_ID
const ig_redirect_uri = process.env.IG_REDIRECT_URI

app.post('/instagram_connect', async (req, res) => {
  const state = uuidv4()
  const { user_id } = req.body

  const tempData = {
    user_id: user_id,
    stored_state: state,
  };

  const jsonData = JSON.stringify(tempData);
  const filePath = '/tmp/instagram_data.json';

  fs.writeFileSync(filePath, jsonData)

  const auth_query_parameters = new URLSearchParams({
    client_id: ig_client_id,
    redirect_uri: ig_redirect_uri,
    scope: 'user_profile user_media',
    response_type: 'code',
    state: state,
  })

  try{
    res.send(`https://api.instagram.com/oauth/authorize?${auth_query_parameters.toString()}`)
  } catch(err){
    console.log("log - ", err)
  } 
})

app.get('/auth_Ig/callback', async (req, res) => {
  const { code, state } = req.query

  const filePath = '/tmp/instagram_data.json'

  try {

    const tempData = fs.readFileSync(filePath, 'utf8')
    const { user_id, stored_state } = JSON.parse(tempData)

    if (state !== stored_state) {
      return res.status(400).send('Invalid state parameter.')
    }

    const userDocRef = admin.firestore().doc(`user/${user_id}`)

    try {
      await userDocRef.update({ 'userData.instagram_connected': true });
      await userDocRef.update({ 'userData.instagram_code': code });
      res.send(`
        <html>
        <body>
        <script>
            window.opener.postMessage('InstagramAuthSuccess', 'https://musiccircle.onrender.com')
            window.close()
        </script>
        </body>
        </html>
    `)
    } catch (error) {
      console.error('Error updating user in Firestore:', error)
      return res.status(500).send('Internal Server Error')
    }

    
  } catch (error) {
    console.error('Error reading data from file:', error)
    return res.status(500).send('Internal Server Error')
  }
})
