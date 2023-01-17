const User = require("../models/User");
const Post = require("../models/Post");
const { success, error } = require("../utils/responseWrapper");
const { mapPostOutput } = require("../utils/Utils");
const cloudinary = require('cloudinary').v2

//FOLLOW OR UNFOLLOW
const followOrUnfollowUserController = async (req, res) => {
  try {
    const { userIdToFollow } = req.body; //get the user whom you want to follow
    const curUserID = req._id; //current user

    const userToFollow = await User.findById(userIdToFollow);
    const curUser = await User.findById(curUserID);

    if (curUserID === userIdToFollow) {
      return res.send(error(409, "Users cannot follow themselves"));
    }
    if (!userToFollow) {
      return res.send(error(404, "User to follow not found"));
    }
    if (curUser.followings.includes(userIdToFollow)) {
      const followingIndex = curUser.followings.indexOf(userIdToFollow);
      curUser.followings.splice(followingIndex, 1);

      const followerIndex = userToFollow.followers.indexOf(curUser);
      userToFollow.followers.splice(followerIndex, 1);
         } else {
      userToFollow.followers.push(curUserID);
      curUser.followings.push(userIdToFollow);
        }
        await userToFollow.save();
        await curUser.save();
    return res.send(success(200,{user: userToFollow}))
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};

//GET POSTS OF PEOPLE YOU FOLLOW
const getPostsOfFollowing = async (req, res) => {
  try {
    const curUserId = req._id;

    const curUser = await User.findById(curUserId).populate('followings');

    //from the posts schema..whosever post's user id matches with my followings user id..we get those posts
    const fullPosts = await Post.find({
      owner: {
        $in: curUser.followings,
      },
    }).populate('owner');

    const posts = fullPosts.map((item) => mapPostOutput(item,req._id)).reverse();
   

const followingsIds = curUser.followings.map((item) => item._id)
 followingsIds.push(req._id)
const suggestions = await User.find({
  _id:{
    $nin: followingsIds
  }
})

    return res.send(success(200, {...curUser._doc,suggestions,posts}));
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};

//GET MY POSTS
//from the posts check if owner id is equal to my user id
const getMyPosts = async (req, res) => {
  try {
    const curUserId = req._id;

    const allUserposts = await Post.find({
      owner: curUserId,
    }).populate("likes"); //in the output we want entire details of likes also to be populated
    return res.send(success(200, { allUserposts }));
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};

//GET USER POSTS  -> get the user id whose posts you want to get..and check with that id in posts schema
const getUserPosts = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.send(error(400, "userId is required"));
    }

    const allUserPosts = await Post.find({
      owner: userId,
    }).populate("likes");

    return res.send(success(200, { allUserPosts }));
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};

//DELETE MY PROFILE => elete oly my profile,delete my posts,remove my followers,clear my following, remove myself from follower's following, unlike all the posts that i liked,delet cookie and logout
const deleteMyProfile = async (req, res) => {
  try {
    console.log("inside delete");
    const curUserId = req._id;

    const curUser = await User.findById(curUserId);

    //delete all posts
    await Post.deleteMany({
      owner: curUserId,
    });

    console.log("before 1");
    //removed myself from followers followings (I am following someone..remove me from their following's list)
    curUser.followers.forEach(async (followerId) => {
      console.log("deleting 1");
      const follower = await User.findById(followerId);
      const index = follower.followings.indexOf(curUserId);
      
      follower.followings.splice(index, 1);
      await follower.save();
    });

    //remove myself from following's follower(some one is following me ..remove me from their follower list)
    curUser.followings.forEach(async (followingId) => {
      const following = await User.findById(followingId);
      const index = following.followers.indexOf(curUserId);
      console.log("deleting 2");
      following.followers.splice(index, 1);
      await following.save();
    });

    //remove myself from all likes.
    const allPosts = await Post.find();
    allPosts.forEach(async (post) => {
      const index = post.likes.indexOf(curUserId);
      post.likes.splice(index, 1);
      await post.save();
    });

    //delete the user
    await curUser.remove();

    //clear the refresh token
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
    });

    return res.send(success(200, "user profile deleted"));
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};



//GET MY INFO
const getMyInfo = async(req,res)=>{
  try {
    const user = await User.findById(req._id)
    return res.send(success(200,{user}))
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  } 
 
}



//UPDATE USER PROFILE(bio,profilePic)
const updateUserProfile = async(req,res)=>{
  try {
    const {name,bio,userImg} = req.body;

    const user = await User.findById(req._id);


if(name){
  user.name = name;
  }
  if(bio){
    user.bio=bio;
      }
      if(userImg){
const cloudImg = await cloudinary.uploader.upload(userImg,{
  folder:'profileImg'
})
user.avatar = {
  url:cloudImg.secure_url,
  publicId:cloudImg.public_id
}
      }
      await user.save();
      return res.send(success(200,{user}))

  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  } 

}

//GET USER PROFILE (open another users profile..you can view their post in their profile)
const getUserProfile = async(req,res)=>{
  try {
    const userId = req.body.userId; //userId is of that other user is passed in the url as params when you click someone else's profile
    const user = await User.findById(userId).populate({   //here we are getting all the posts of the other user 
      path:'posts',   //going to posts table and also taking owner from there..it is the same user id..useful for front end. here we get follwers.follwoing.likes n all such details of that user 
      populate :{
        path: 'owner'
      }
    })

    const fullPosts = user.posts;

    //adding the mapPostOutput format before sending each post of another user back to that user(req._id) who is viewing another user profile in reverese order(latest post up)
const posts = fullPosts.map(item => mapPostOutput(item,req._id)).reverse();
return res.send(success(200,{...user._doc,posts}))  //...user._doc sending just the schema usefuk info..
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  } 
 
}

module.exports = {
  followOrUnfollowUserController,
  getPostsOfFollowing,
  getMyPosts,
  getUserPosts,
  deleteMyProfile,
  getMyInfo,
  updateUserProfile,
  getUserProfile
};
