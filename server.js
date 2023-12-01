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
    const { userData} = req.body
    const { id, type } = userData

    try {
      const userDocRef = admin.firestore().doc(`${type}/${id}`)
      const userDoc = await userDocRef.get()

      if (userDoc.exists) {
          console.log("log -", userDoc.data().userData)
          res.json(userDoc.data().userData)
        } else {  
          await userDocRef.set({userData})
          res.json(userData)
        }
      } catch(err){
        console.log(err)
      }
  })

  app.post('/api/profile/top_tracks', async (req, res)  => {
    const { id, topTracks } = req.body

    const userDocRef = admin.firestore().doc(`user/${id}`)
    
    try {
      await userDocRef.update({ top_tracks: topTracks })
      const user = await userDocRef.get()

      if (user.data().show_top_tracks === undefined) {
        userDocRef.update({show_top_tracks: true})
        }
      res.status(200).json({ message: 'Top tracks updated successfully.' })
  } catch(err) {
      console.error(err)
      res.status(500).json({ error: 'Internal Server Error' })
  }
  })

  app.post('/api/profile/top_artists', async (req, res)  => {
    const { id, topArtists } = req.body

    const userDocRef = admin.firestore().doc(`user/${id}`)
    
    try {
      await userDocRef.update({top_artists: topArtists})
      const user = await userDocRef.get()

      if (user.data().show_top_artists === undefined) {
        userDocRef.update({show_top_artists: true})
      }
      res.status(200).json({ message: 'Top artists updated successfully.' })
    } catch(err) {
        console.error(err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  app.get('/api/profile/top_tracks/:id', async (req, res)  => {
    const id = req.params.id
    const userDocRef = admin.firestore().doc(`user/${id}`)

    try {
      const doc = await userDocRef.get()
      if (doc.exists) {
          const data = {
            showTopTracks: doc.data().show_top_tracks,
            tracks: doc.data().top_tracks
          }
          res.json(data)
      } else {
          res.status(404).json({ error: 'User not found.' })
      }
  } catch(err) {
      console.error(err)
      res.status(500).json({ error: 'Internal Server Error' })
  }
  })

  app.get('/api/profile/top_artists/:id', async (req, res)  => {
    const id = req.params.id
    const userDocRef = admin.firestore().doc(`user/${id}`)

    try {
      const doc = await userDocRef.get()
      if (doc.exists) {
        const data = {
          showTopArtists: doc.data().show_top_artists,
          artists: doc.data().top_artists
        }
        res.json(data)
      } else {
          res.status(404).json({ error: 'User not found.' })
      }
  } catch(err) {
      console.error(err)
      res.status(500).json({ error: 'Internal Server Error' })
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
          console.log(`Deleted ${messagesToDelete} old message(s) to maintain limit.`)
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


