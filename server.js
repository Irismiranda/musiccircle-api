const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const axios = require('axios')
const socketIo = require('socket.io')
const querystring = require('querystring')
const { v4: uuidv4 } = require('uuid')
const {Firestore} = require('@google-cloud/firestore')
const admin = require('firebase-admin')
const functions = require('firebase-functions')

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

  app.post('/api/account', async (req, res) => {
    const { userData } = req.body
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

  app.post('/api/account', async (req, res) => {
    const { userData } = req.body
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

  app.get('/api/:loggedUserId/is_following/:currentUserId', async (req, res) => {
    const { loggedUserId, currentUserId} = req.params
  
    try {
      const loggedUserDocRef = admin.firestore().doc(`user/${loggedUserId}`)
      const doc = await loggedUserDocRef.get()
      const loggedUserData = doc.data()

      const isFollowing = Array.isArray(loggedUserData.userData.following) && loggedUserData.userData.following.some(user => user === currentUserId)
      res.send(isFollowing)

    } catch (error) {
        console.error(error)
        res.status(500).send('Internal Server Error')
    }
  })

  app.post('/api/:loggedUserId/toggle_follow/:currentUserId', async (req, res) => {
    const { loggedUserId, currentUserId} = req.params

    try {
      const loggedUserDocRef = admin.firestore().doc(`user/${loggedUserId}`)
      const currentUserDocRef = admin.firestore().doc(`user/${currentUserId}`)

      const loggedUserDoc = await loggedUserDocRef.get()
      const currentUserDoc = await currentUserDocRef.get()

      const loggedUserData = loggedUserDoc.data()
      const currentUserData = currentUserDoc.data()

      const loggedUserFollowing = loggedUserData.userData.following || []
      const currentUserFollowers = currentUserData.userData.following_you || []

      const isFollowing = loggedUserFollowing.includes(currentUserId)

      if (isFollowing) {
        await loggedUserDocRef.update({
          'userData.following': admin.firestore.FieldValue.arrayRemove(currentUserId)
        })

        await currentUserDocRef.update({
          'userData.following_you': admin.firestore.FieldValue.arrayRemove(loggedUserId)
        })

      } else {

        loggedUserFollowing.push(currentUserId)
        currentUserFollowers.push(loggedUserId)

        await loggedUserDocRef.update({
          'userData.following': admin.firestore.FieldValue.arrayUnion(currentUserId)
        })

        await currentUserDocRef.update({
          'userData.following_you': admin.firestore.FieldValue.arrayUnion(loggedUserId)
        })
      }

      try{
        const updatedLoggedUser = await loggedUserDocRef.get()
        const updatedCurrentUser = await currentUserDocRef.get()

        const udaptedIsFollowing = updatedLoggedUser.data().userData.following.includes(currentUserId)

        res.send({isFollowing: udaptedIsFollowing, updatedLoggedUser: updatedLoggedUser.data().userData, updatedCurrentUser: updatedCurrentUser.data().userData})
      } catch(error){
        console.log(error)
      }

    } catch (error) {
      console.error(error)
      res.status(500).send('Internal Server Error')
    }
  })

  app.post('/api/user/:category', async (req, res) => {
    const { id, items } = req.body
    const { category } = req.params
    const userDocRef = admin.firestore().doc(`user/${id}`)
    console.log("received items for", category, "are:", items)

    try {
        const user = await userDocRef.get()
        const prevData = user.data()
        const prevList = prevData[category] || null

        if (prevList) {
            const prevHiddenItems = prevList.items.filter(item => item.isVisible === false)
            console.log("prev hidden items are:", prevHiddenItems)

            const prevHiddenItemIds = prevHiddenItems.map(item => item.id)
            console.log("prev hidden item ids are:", prevHiddenItemIds)

            const updatedItems = items.map(item => {
              console.log("item is:", item, "is hidden:", prevHiddenItemIds.includes(item.id))
              return prevHiddenItemIds.includes(item.id) ? { ...item, isVisible: false } : item
          })

            const updatedList = {...prevList, items: updatedItems}
            console.log("updated list for", category, "is:", updatedList)
            
            // Check if 'show_[category]' exists
            if (prevList[`show_${category}`] === undefined) {
              updatedList[`show_${category}`] = true
            }
            
            // Perform the update in a single call
            await userDocRef.update({[category]:updatedList})

            // Send the updated list as the response
            res.send(updatedList)
        } else {
            const newList = {
              [`show_${category}`]: true,
              items: items,
            } 
            // In case there's no previous data for this category
            await userDocRef.update({ [category]: newList })
            res.send(newList)
        }
    } catch(err) {
        console.error(err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

app.get('/api/user/:category/:id', async (req, res)  => {
  const { id, category } = req.params
  const userDocRef = admin.firestore().doc(`user/${id}`)
  try {
    const doc = await userDocRef.get()
    const data = doc.data()
    const list = data[category] || null
    if (list) {
        res.json(list)
    } else {
        res.status(404).json({ error: 'User not found.' })
    }
} catch(err) {
    console.error(err)
    res.status(500).json({ error: 'Internal Server Error' })
}
})

  app.post('/api/user/:category/hide_item', async (req, res)  => {
    const { userId, itemId } = req.body
    const { category } = req.params
    const userDocRef = admin.firestore().doc(`user/${userId}`)

    try {
        const doc = await userDocRef.get()
        if (doc.exists) {
            const userData = doc.data()
            const topList = userData[category]
            const updatedItems = topList.items.map(item => item.id === itemId ? {...item, isVisible: !item.isVisible } : item)
            const updatedList = {...topList, items: updatedItems}
            const updateObject = { [category]:  updatedList}

            await userDocRef.update(updateObject)
            res.json(updateObject)
        } else {
            res.status(404).json({ error: 'User not found.' })
        }
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

  app.post('/api/user/:category/hide_category', async (req, res) => {
    const { userId } = req.body
    const { category } = req.params

    console.log("userId is:", userId, "category is:", category)

    const userDocRef = admin.firestore().doc(`user/${userId}`)

    try {
      const doc = await userDocRef.get()
      if (doc.exists) {
          const userData = doc.data()
          const topList = userData[category]
          console.log("top list is:", topList)
          const updatedList = {...topList, [`show_${category}`]: !topList[`show_${category}`]}
          const updatedObject = { [category]: updatedList}
          await userDocRef.update(updatedObject)
          res.send(updatedList)
      } else {
          res.status(404).json({ error: 'User not found.' })
      }
  } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' })
  }
  })

  app.get('/api/search/user/:search_term', async (req, res) => {
    const { search_term } = req.params
    const collectionRef = admin.firestore().collection('user')
    
    console.log("search term is", search_term)
    
    try{
      const querySnapshot = await collectionRef
      .where(
        Filter.or(
          Filter.where('display_name', 'contains', search_term),
          Filter.where('id', 'contains', search_term)
        )
      )
      .get()
      
      const results =  await getDocs(querySnapshot)
      const users = []

      console.log("results are:", results)

      results.forEach((doc) => {
        const userData = doc.data()
        users.push(userData)

        console.log("user data is", userData)
      })
      
      res.send(users)
    
    } catch(err){
      console.log(err)
    }
  })

  //Chats

  const firestore = new Firestore()
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://<your-database-name>.firebaseio.com',
  })


  io.on('connection', (socket) => {
    console.log('Client connected')
    
    socket.on('connectToChat', async ({ id, type }) => {
      try {
        const chatCollectionRef = admin.firestore().collection(`${type}/${id}/chats`)
        const existingChatQuery = await chatCollectionRef.get();
        let currentChatId = '';
    
        if (existingChatQuery.size > 0) {
          currentChatId = existingChatQuery.docs[0].id
          console.log('Found existing chat:', currentChatId)
        } else {
          const newChatId = `${id}_${uuidv4()}`
          console.log('New chat id is:', newChatId)
          await chatCollectionRef.doc(newChatId).set({})
          currentChatId = newChatId;
          console.log('New chat created', currentChatId)
        }
    
        let isFirstSnapshot = true;
        const messagesRef = admin.firestore().collection(`${type}/${id}/chats/${currentChatId}/messages`)
        messagesRef.onSnapshot((snapshot) => {
          const messages = snapshot.docChanges()
            .filter(change => change.type === 'added' || change.type === 'modified')
            .map(change => change.doc.data());
    
          if (isFirstSnapshot) {
            io.to(currentChatId).emit('loadAllMessages', messages)
            isFirstSnapshot = false;
          } else {
            io.to(currentChatId).emit('loadNewMessage', messages)
          }
        })
    
        socket.join(currentChatId);
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


