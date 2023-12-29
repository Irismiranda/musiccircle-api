const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const axios = require('axios')
const socketIo = require('socket.io')
const querystring = require('querystring')
const { v4: uuidv4 } = require('uuid')
const { Firestore, Filter } = require('@google-cloud/firestore')
const admin = require('firebase-admin')
const functions = require('firebase-functions')
const { request } = require('http')

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
      
    } catch (err) {
      console.log("failed to refreshed token", err)
      console.err('err refreshing access token:', err)
      res.status(500).json({ err: 'Internal Server err' })
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

  app.post('/api/user/:user_id', async (req, res) => {
    const { user_id } = req.params

    try {
      const userDocRef = admin.firestore().doc(`user/${user_id}`)
      const userDoc = await userDocRef.get()

      if (userDoc.exists) {
          res.json(userDoc.data().userData)
        } else {  
          await userDocRef.set({userData})
          res.json(userData)
        }
      } catch(err){
        console.log(err)
      }
  })

  app.get('/api/user/:user_id', async (req, res) => {
    const { user_id } = req.params
    const userDocRef = admin.firestore().doc(`user/${user_id}`)
    
    try {
      const userDoc = await userDocRef.get()
      res.json(userDoc.data().userData)
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

    } catch (err) {
        console.err(err)
        res.status(500).send('Internal Server err')
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
      } catch(err){
        console.log(err)
      }

    } catch (err) {
      console.err(err)
      res.status(500).send('Internal Server err')
    }
  })

  app.post('/api/user/:category', async (req, res) => {
    const { id, items } = req.body
    const { category } = req.params
    const userDocRef = admin.firestore().doc(`user/${id}`)

    try {
        const user = await userDocRef.get()
        const prevData = user.data()
        const prevList = prevData[category] || null

        if (prevList) {
            const prevHiddenItems = prevList.items.filter(item => item.isVisible === false)

            const prevHiddenItemIds = prevHiddenItems.map(item => item.id)

            const updatedItems = items.map(item => {
              return prevHiddenItemIds.includes(item.id) ? { ...item, isVisible: false } : item
          })

            const updatedList = {...prevList, items: updatedItems}
            
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
        console.err(err)
        res.status(500).json({ err: 'Internal Server err' })
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
        res.status(404).json({ err: 'User not found.' })
    }
} catch(err) {
    console.err(err)
    res.status(500).json({ err: 'Internal Server err' })
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

            console.log("user data is", userData)

            const topList = userData[category]

            console.log("top list is", topList)

            const updatedItems = topList.items.map(item => item.id === itemId ? {...item, isVisible: !item.isVisible } : item)
            const updatedList = {...topList, items: updatedItems}
            const updateObject = { [category]:  updatedList}

            await userDocRef.update(updateObject)
            res.json(updateObject)
        } else {
            res.status(404).json({ err: 'User not found.' })
        }
    } catch(err) {
        console.err(err);
        res.status(500).json({ err: 'Internal Server err' })
    }
})

  app.post('/api/user/:category/hide_category', async (req, res) => {
    const { userId } = req.body
    const { category } = req.params

    const userDocRef = admin.firestore().doc(`user/${userId}`)

    try {
      const doc = await userDocRef.get()
      if (doc.exists) {
          const userData = doc.data()
          const topList = userData[category]
          const updatedList = {...topList, [`show_${category}`]: !topList[`show_${category}`]}
          const updatedObject = { [category]: updatedList}
          await userDocRef.update(updatedObject)
          res.send(updatedList)
      } else {
          res.status(404).json({ err: 'User not found.' })
      }
  } catch(err) {
      console.err(err);
      res.status(500).json({ err: 'Internal Server err' })
  }
  })

  app.get('/api/search/user/:search_term', async (req, res) => {
    const { search_term } = req.params
    const collectionRef = admin.firestore().collection('user')
    
    try{
      const results = await collectionRef
      .where('userData.user_handle', '>=', search_term)
      .where('userData.user_handle', '<=', search_term + '\uf8ff')
      .limit(20)
      .get()
      
      const users = []

      results.forEach((doc) => {
        const userDoc = doc.data()
        users.push(userDoc.userData)
      })

    res.send(users)
    
    } catch(err){
      console.log(err)
    }
  })

  app.get('/api/:user_id/posts', async (req, res) => {
    const { user_id } = req.params
    const userDocRef = admin.firestore().doc(`user/${user_id}`)
    const postsCollectionRef = userDocRef.collection('posts')
    
    try{
      const postsCollection = await postsCollectionRef.get()

      if(!postsCollection.empty){
        const posts = postsCollection.docs.map(post => {
          return post.data()
        })

        res.send(posts)
      } else {
        res.send({})
      }
    } catch(err){
      console.log(err)
    }
  })

  app.post('/api/:user_id/post/:content_id', async (req, res) => {
    const { user_id, content_id } = req.params
    const { description, type } = req.body
    const post_id = uuidv4()

    const collectionRef = admin.firestore().collection(`user/${user_id}/posts`)
    try{
      await collectionRef.doc(post_id).set({
        description: description,
        type: type, 
        id: content_id,
        post_id: post_id,
        user_id: user_id,
      })
      res.status(200).send("Post created")
    } catch(err){
      console.log(err)
      res.status(500).send("Internal Server err")
    }

  })

  app.post('/api/:user_id/:post_id/toggle_hide_post', async (req, res) => {
    const { user_id, post_id } = req.params
    const userDocRef = admin.firestore().doc(`user/${user_id}`)
    
    const postsCollectionRef = userDocRef.collection('posts')

    try{
      const postDocRef = postsCollectionRef.doc(post_id)
      const postDoc = await postDocRef.get()

      await postDocRef.update({
        hide_post: !postDoc.data().hide_post || false,
      })

      const updatedPostsSnapshot = await postsCollectionRef.get()
      const updatedPosts = updatedPostsSnapshot.docs.map((doc) => doc.data())

      console.log("updated collection is", updatedPosts)
      res.send(updatedPosts)
      
    } catch(err){
      console.log(err)
    }

  })

  app.post('/api/:user_id/:post_id/delete_post', async (req, res) => {
    const { user_id, post_id } = req.params
    const userDocRef = admin.firestore().doc(`user/${user_id}`)
    
    const postsCollectionRef = userDocRef.collection('posts')

    try{
      const postDocRef = postsCollectionRef.doc(post_id)
      await postDocRef.delete()
     
      const updatedPostsSnapshot = await postsCollectionRef.get()
      const updatedPosts = updatedPostsSnapshot.docs.map((doc) => doc.data())
      res.send(updatedPosts)
      
    } catch(err){
      console.log(err)
    }

  })

  app.post('/api/:post_id/add_comment', async (req, res) => {
    const { post_id } = req.params
    const newCommentData = req.body
    const { poster_id, artist_id } = newCommentData

    newCommentData.comment_id = uuidv4()

    try{
      const commentsCollectionRef = poster_id ? 
      admin.firestore().collection(`user/${poster_id}/posts/${post_id}/comments`) :
      admin.firestore().collection(`artists/${artist_id}/${post_id}/posts/comments`)

      await commentsCollectionRef.add(newCommentData)
      res.status(201).send("Comment added successfully")
    } catch(err){
      console.log(err)
    }

  })

  app.post('/api/:post_id/reply_to/:comment_id', async (req, res) => {
    const { post_id, comment_id } = req.params
    const newCommentData = req.body
    const { poster_id, artist_id } = newCommentData

    newCommentData.comment_id = uuidv4()

    if(poster_id){
      try{
        const commentDocRef = 
        poster_id ? 
        admin.firestore().collection(`user/${poster_id}/posts/${post_id}/comments/${comment_id}`) :
        admin.firestore().collection(`artists/${artist_id}/${post_id}/posts/comments/${comment_id}`)

        const commentSnapshot = await commentDocRef.get()
        const existingData = commentSnapshot.data() || {}
        const prevReplies = existingData.replies || []

        await commentDocRef.update({
          replies: [...prevReplies, newCommentData]
        })

        res.status(201).send("Comment added successfully")
      } catch(err){
        console.log(err)
      }
    }
  })

  app.post('/api/:poster_id/:artist_id/:post_id/delete_comment/:comment_id', async (req, res) => {
    const { poster_id, artist_id, post_id, comment_id } = req.params
    const commentDocRef = poster_id ? 
    admin.firestore().doc(`user/${poster_id}/posts/${post_id}/comments/${comment_id}`) :
    admin.firestore().doc(`artists/${artist_id}/${post_id}/posts/comments/${comment_id}`)

    try{
      commentDocRef.delete()
    } catch(err){
      console.log(err)
    }
  })

  app.post('/api/:poster_id/:artist_id/:post_id/delete_reply/:comment_id/:reply_id', async (req, res) => {
    const { poster_id, artist_id, post_id, comment_id, reply_id } = req.params
    const commentDocRef = poster_id ? 
    admin.firestore().doc(`user/${poster_id}/posts/${post_id}/comments/${comment_id}`) :
    admin.firestore().doc(`artists/${artist_id}/${post_id}/posts/comments/${comment_id}`)
    try{
      const commentSnapshot = await commentDocRef.get()
      const commentDoc = commentSnapshot.data()
  
      const updatedReplies = commentDoc.replies.filter(reply => reply.id !== reply_id)
      commentDocRef.update({replies: updatedReplies})   

      res.status(200).send("Reply deleted successfully")
    } catch(err){
      console.log(err)
    }
  })

  io.on('connection', (socket) => {
    socket.on('listenToComments', async ({ post_id, poster_id, artist_id }) => {
      try {
        socket.join(post_id)

        const commentsCollectionRef = poster_id ? 
        admin.firestore().collection(`user/${poster_id}/posts/${post_id}/comments`) :
        admin.firestore().collection(`artists/${artist_id}/${post_id}/posts/comments`)

        let isFirstSnapshot = true
        commentsCollectionRef.onSnapshot((snapshot) => {
          const comments = snapshot.docChanges()
            .filter(change => change.type === 'added' || change.type === 'modified')
            .map(change => change.doc.data())
          if (isFirstSnapshot) {
            io.to(post_id).emit('loadAllComments', comments)
            isFirstSnapshot = false
          } else {
            io.to(post_id).emit('loadNewComment', comments)
          }
        })

      socket.on('disconnectFromComments', ({ post_id }) => {
          socket.leave(post_id)
      })
      } catch(err){
        console.log(err)
      }
    })
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
      } catch (err) {
        console.err('err creating/updating chat:', err)
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
      } catch (err) {
        console.err('err adding message to Firestore:', err)
      }
    })

    socket.on('removeMessage', async ({ id, chatId, messageId }) => {
      const messageRef =  admin.firestore().doc(`artists/${id}/chats/${chatId}/messages/${messageId}`)
      try {
          await messageRef.update({
              display: false
          })
          console.log('Message display status updated successfully.')
        } catch (err) {
            console.err('err updating message display status:', err)
        }
    })

    socket.on('leaveChat', ({ chatId }) => {
      socket.leave(chatId)
      console.log('Disconnecting from chat:', chatId)
    })
  })


