//UI Elements
var announcementStart = document.getElementById("startDate");
var announcementEnd = document.getElementById("endDate");
var announcementBody = document.getElementById("announcementBody");
var announcementTitle = document.getElementById("announcementTitle");
var announcementModerator = document.getElementById("moderatorSelection");
//Admin UI Elements
var moderatorNickname = document.getElementById("nickname");
var moderatorUID = document.getElementById("uid");

//Database
var database = firebase.database();


var provider = new firebase.auth.GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
  'hd': 'tdsb.on.ca'
});

$(document).ready(function() {
  firebase.auth().getRedirectResult().then(function(result) {
    if (result.credential) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // ...
    }
    // The signed-in user info.
    var user = result.user;
  }).catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    var email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;
    // ...
  });
});

function login() {
  firebase.auth().signInWithRedirect(provider);
}

function logout() {
  firebase.auth().signOut()
    .then(function() {
      console.log("Logged out!");
    })
    .catch(function(error) {
      console.log(error);
    });
}

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    $("#rightNav").html('<span style="padding-right:20px;">' + firebase.auth().currentUser.displayName + '</span><button onclick="logout()" class="mdl-button mdl-js-button mdl-button--accent">Logout</button>');

    //Check admin
    firebase.database().ref('permissions/' + firebase.auth().currentUser.uid).once('value', function(data) {
      if (data.val().admin == true)
        $(".rowButtons").removeClass('adminOnly');
    });


    if (window.location.pathname.split("/").pop() == "admin.html") {
      populateVerification();
      populateModerators();
    } else
      populateUserAnnouncements();
  } else {
    $("#rightNav").html('<button onclick="login()" class="mdl-button mdl-js-button mdl-button--accent">Login</button>');
  }
});

//Submit announcement
function submitAnnouncement() {
  //Check if all data is present
  if (announcementBody.value.length == 0 || announcementEnd.value.length == 0 || announcementStart.value.length == 0 || announcementTitle.value.length == 0 || announcementModerator.value.length == 0) {
    showMessage("Please complete the form to submit an announcement for review.");
    return;
  }

  //Check if the user is logged in
  if (!firebase.auth().currentUser) {
    showMessage("Please log into your TDSB email account to submit an announcement.");
    return;
  }

  //Check if the date input is valid
  if (Date.parse(announcementStart.value) > Date.parse(announcementEnd.value)) {
    showMessage("The end date cannot be before the start date.");
    return;
  }

  //Send to Firebase
  var newAnnouncement = firebase.database().ref('unverified_announcements/').push({
    authorUID: firebase.auth().currentUser.uid,
    title: announcementTitle.value,
    announcement: announcementBody.value,
    startDate: announcementStart.value,
    endDate: announcementEnd.value,
    moderator: announcementModerator.value
  });

  showMessage(announcementTitle.value + " has been submitted for review.");
}


function populateVerification() {
  // Check if user is an admin
  firebase.database().ref('permissions/' + firebase.auth().currentUser.uid).once('value', function(data) {
    if (data.val().admin == true) {
      database.ref('unverified_announcements').on('value', function(data) {
        var unverified = data.val();

        //Check if there is any data to diplay
        if (unverified == null) {
          $("#verifyAnnouncement").html("<p style='text-align:center;'>No unverified announcements.</p>");
          showMessage("Woohoo! No unverified announcements.");
          return;
        }

        var keys = Object.keys(unverified);
        $("#verifyAnnouncement").html("");
        for (var x = 0; x < keys.length; x++) {
          $("#verifyAnnouncement").append("<div class='panel rowAnnouncement' id='unverified_" + keys[x] + "'><div class='row'><h4 class='col s12'>" + unverified[keys[x]].title + "</h4></div><div class='row'><p class='col s12'>" + unverified[keys[x]].announcement + "</p></div><div class='row'><div class='rowButtons col s12'><button class='red darken-4 mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent' onclick='failVerification(" + '"' + keys[x] + '"' + ")'>Delete</button><button class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent' onclick='passVerification(" + '"' + keys[x] + '"' + ")'>Verify</button></div></div></div>");
        }
      }, function() {
        showMessage("An error occured while serving this request. Please try again later.");
      });
    } else {
      database.ref('unverified_announcements').orderByChild('moderator').equalTo(firebase.auth().currentUser.uid).on('value', function(data) {
        var unverified = data.val();

        //Check if there is any data to diplay
        if (unverified == null) {
          $("#verifyAnnouncement").html("<p style='text-align:center;'>No unverified announcements.</p>");
          showMessage("Woohoo! No unverified announcements.");
          return;
        }

        var keys = Object.keys(unverified);
        $("#verifyAnnouncement").html("");
        for (var x = 0; x < keys.length; x++) {
          $("#verifyAnnouncement").append("<div class='panel rowAnnouncement' id='unverified_" + keys[x] + "'><div class='row'><h4 class='col s12'>" + unverified[keys[x]].title + "</h4></div><div class='row'><p class='col s12'>" + unverified[keys[x]].announcement + "</p></div><div class='row'><div class='rowButtons col s12'><button class='red darken-4 mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent' onclick='failVerification(" + '"' + keys[x] + '"' + ")'>Delete</button><button class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent' onclick='passVerification(" + '"' + keys[x] + '"' + ")'>Verify</button></div></div></div>");
        }
      }, function() {
        showMessage("An error occured while serving this request. Please try again later.");
      });
    }
  });
}


function failVerification(key) {
  database.ref('unverified_announcements').child(key).remove();
}

function deleteAnnouncement(key) {
  database.ref('verified_announcements').child(key).remove();
}

function passVerification(key) {
  database.ref('unverified_announcements').child(key).once("value", function(data) {
    var newAnnouncement = firebase.database().ref('verified_announcements/').push({
      title: data.val().title,
      verifier: firebase.auth().currentUser.uid,
      announcement: data.val().announcement,
      startDate: data.val().startDate,
      endDate: data.val().endDate,
      authorUID: data.val().authorUID
    });
  });

  database.ref('unverified_announcements').child(key).remove();
}

function populateVerified() {
  database.ref('verified_announcements').on('value', function(data) {
    var verified = data.val();

    //Check if there is any data to diplay
    if (verified == null) {
      $("#verifyAnnouncement").html("<p style='text-align:center;'>No announcements for today.</p>");
      showMessage("No announcements for today.");
      $("#verifiedAnnouncement").html("<p style='text-align:center'>No announcements for today.</p>");
      return;
    }

    var keys = Object.keys(verified);
    $("#verifiedAnnouncement").html("");

    var date = new Date();
    var currentDate = (date.getUTCMonth() + 1) +"/"+ date.getUTCDate() + "/" +date.getUTCFullYear();
    
    for (var x = 0; x < keys.length; x++) {
      if(Date.parse(verified[keys[x]].startDate) <= Date.parse(currentDate) && Date.parse(verified[keys[x]].endDate) >= Date.parse(currentDate))
      $("#verifiedAnnouncement").append("<div class='panel rowAnnouncement' id='verified_" + keys[x] + "'><div class='row'><h4 class='col s12'>" + verified[keys[x]].title + "</h4></div><div class='row'><p class='col s12'>" + verified[keys[x]].announcement + "</p></div><div class='row'><div style='margin-top:21px!important;' class='rowButtons col s12 adminOnly'><button class='waves-effect waves-light red darken-4 btn' onclick='deleteAnnouncement(" + '"' + keys[x] + '"' + ")'>Delete</button></div></div>");
    }
  }, function(e) {
    showMessage("An error occured while serving this request. Please try again later.");
  });
}

function showMessage(message) {
  var generalMessage = document.querySelector('#generalMessage');
  var data = {
    message: message
  };
  generalMessage.MaterialSnackbar.showSnackbar(data);
}

function copyUID() {
  //Check if user is logged in
  if (!firebase.auth()) {
    showMessage("You must be logged in to have a UID.");
    return;
  }

  const temp = document.createElement('textarea');
  temp.value = firebase.auth().currentUser.uid;
  temp.setAttribute('readonly', '');

  //Hide element
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);

  showMessage("UID Copied to clipboard");
}

function populateModerators() {
  firebase.database().ref('permissions/' + firebase.auth().currentUser.uid).once('value', function(data) {
    if (data.val().admin == true) {
      database.ref('permissions').on('value', function(data) {
        var moderators = data.val();

        //Check if there is any data to diplay
        if (moderators == null) {
          $("#moderators").html("<p style='text-align:center;'>No moderators created.</p>");
          showMessage("No moderators found.");
          return;
        }

        var keys = Object.keys(moderators);
        $("#moderators").html("");
        for (var x = 0; x < keys.length; x++) {
          $("#moderators").append("<div class='panel rowAnnouncement' id='verified_" + keys[x] + "'><div style='margin-bottom:5px;' class='row'><h4 class='col s6'>" + moderators[keys[x]].nickname + "</h4><div style='margin-top:21px!important;' class='rowButtons col s6'><button class='waves-effect waves-light red darken-4 btn' onclick='deleteModerator(" + '"' + keys[x] + '"' + ")'>Delete</button></div></div></div>");
        }
      }, function(e) {
        console.log(e);
        showMessage("An error occured while serving this request. Please try again later.");
      });
    } else {
      $("#moderators").html("<p style='text-align:center;'>You do not have permission to modify moderators.</p>");
    }
  });
}

function toggleNewModerator() {
  $("#newModerator").toggleClass('noDisplay');
}

function createModerator() {
  if (moderatorNickname.value.length == 0 || moderatorUID.value.length == 0) {
    showMessage("Please complete the form to create a new moderator.");
    return;
  }

  //Check if the user is logged in
  if (!firebase.auth().currentUser) {
    showMessage("Please log into your TDSB email account to create a new moderator.");
    return;
  }

  //Send to Firebase
  var newAnnouncement = firebase.database().ref('permissions/' + moderatorUID.value).set({
    admin: false,
    moderator: true,
    nickname: moderatorNickname.value
  });

  showMessage(moderatorNickname.value + " was created successfully.");
}

function deleteModerator(key) {
  database.ref('permissions').child(key).remove();
}

function populateModeratorSelector() {
  database.ref('permissions').on('value', function(data) {
    var moderators = data.val();

    //Check if there is any data to diplay
    if (moderators == null) {
      $("#moderatorSelection").append('<option value="" disabled selected>No moderators available. Please try again later.</option>');
      showMessage("No moderators found.");
      return;
    }

    var keys = Object.keys(moderators);
    for (var x = 0; x < keys.length; x++) {
      $("#moderatorSelection").append("<option value='" + keys[x] + "'>" + moderators[keys[x]].nickname + "</option>");
    }
  }, function(e) {
    console.log(e);
    showMessage("An error occured while serving this request. Please try again later.");
  });
}

function populateUserAnnouncements() {
  var noVerified = false;
  var noUnVerified = false;

  if (!firebase.auth()) {
    $("#userAnnouncements").html("<p style='text-align:center;'>Please login to view your announcements.</p>");
    return;
  }

  $("#userAnnouncements").html("");

  var ref = database.ref('unverified_announcements').orderByChild('authorUID').equalTo(firebase.auth().currentUser.uid);

  ref.once('value', snapshot => {
    if (snapshot.exists()) {
      var unVerified = snapshot.val();
      unVerified = Object.values(unVerified);

      if (snapshot.numChildren() != 0)
        $("#userAnnouncements").append("<div class='panel'><div class='row'><h3 class='col s12'>Unverified Announcements</h3></div></div>");

      for (var x = 0; x < snapshot.numChildren(); x++) {
        $("#userAnnouncements").append("<div class='panel rowAnnouncement' id='unverified_" + x + "'><div class='row'><h4 class='col s12'>" + unVerified[x].title + "</h4></div><div class='row'><p class='col s12'>" + unVerified[x].announcement + "</p></div><div class='row'><div style='margin-top:21px!important;' class='rowButtons col s12 adminOnly'><button class='waves-effect waves-light red darken-4 btn' onclick='deleteAnnouncement(" + '"' + unVerified[x].authorUID + '"' + ")'>Delete</button></div></div>");
      }
    } else {
      noUnVerified = true;
    }
  });

  var ref = database.ref('verified_announcements').orderByChild('authorUID').equalTo(firebase.auth().currentUser.uid);

  ref.once('value', snapshot => {
    if (snapshot.exists()) {
      var verified = snapshot.val();
      verified = Object.values(verified);

      if (snapshot.numChildren() != 0)
        $("#userAnnouncements").append("<div class='panel'><div class='row'><h3 class='col s12'>Verified Announcements</h3></div></div>");

      for (var x = 0; x < snapshot.numChildren(); x++) {
        $("#userAnnouncements").append("<div class='panel rowAnnouncement' id='verified_" + x + "'><div class='row'><h4 class='col s12'>" + verified[x].title + "</h4></div><div class='row'><p class='col s12'>" + verified[x].announcement + "</p></div><div class='row'><div style='margin-top:21px!important; display:none;' class='rowButtons col s12'><button class='waves-effect waves-light red darken-4 btn' onclick='deleteAnnouncement(" + '"' + verified[x].authorUID + '"' + ")'>Delete</button></div></div>");
      }
    } else {
      noVerified = true;
    }
  });

  if (noUnVerified)
    $("#userAnnouncements").append("<p style='text-align:center;'>You have no unverified announcements.</p>");

  if (noVerified)
    $("#userAnnouncements").append("<p style='text-align:center;'>You have no verified announcements.</p>");

  if ($("#userAnnouncements").html == "")
    $("#userAnnouncements").html('<div class="panel" id="createAnnouncement"><div class="row"><div class="col s6" ><h3>My Announcements</h3></div></div></div>');
}
