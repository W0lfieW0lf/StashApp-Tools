// ==UserScript==
// @name        Stash-TMDB Interface
// @namespace   https://github.com/WolfieWolff/Stash-App-Tools
// @match       https://www.themoviedb.org/movie/*
// @match       https://www.themoviedb.org/person/*
// @match       https://www.themoviedb.org/tv/*
// @grant       none
// @version     3.0
// @author      MSB
// @description Sync Button in TMDB Site.to Create Movie/Performer in Stash and Update performer missing info.
// @grant GM_setValue
// @grant GM_getValue
// @grant GM.setValue
// @grant GM.getValue
// @grant GM_setClipboard
// @grant unsafeWindow
// @grant GM.xmlHttpRequest
// @require https://cdn.jsdelivr.net/npm/lodash@4.17.20/lodash.min.js
// ==/UserScript==
(function () {
  "use strict";

  const lodash = window._;
  // console.log('lodash version'._.VERSION);
  const transform = lodash.transform;
  const isEqual = lodash.isEqual;
  const isArray = lodash.isArray;
  const isObject = lodash.isObject;

  var DEBUG = true;
  // ENABLE/DISABLE Console Logs
  if (!DEBUG) {
    console.log = function () {};
  }

  const loading_animation =
    "https://media.vietq.vn/files/loading-animation.gif";

  var pushState = history.pushState;
  var replaceState = history.replaceState;
  history.pushState = function () {
    pushState.apply(history, arguments);
    window.dispatchEvent(new Event("pushstate"));
    window.dispatchEvent(new Event("locationchange"));
  };
  history.replaceState = function () {
    replaceState.apply(history, arguments);
    window.dispatchEvent(new Event("replacestate"));
    window.dispatchEvent(new Event("locationchange"));
  };
  window.addEventListener("popstate", function () {
    window.dispatchEvent(new Event("locationchange"));
  });

  window.addEventListener("hashchange", function () {
    alert("onhashchange event occurred!");
  });
  const pageScenario = {
    1: "person",
    2: "movie",
    3: "tv",
    4: "seasons",
    5: "season",
    6: "episode",
  };

  //If the country is in TMDB but not added to Stash performer.Get the country from TMDB and Contry Code from Stash and mapit.
  // 'TMDB Country name' : 'Stash Country Code'
  const countryCodes = {
    China: "CN",
    India: "IN",
    Philippines: "PH",
    "South Korea": "KR",
    USA: "US",
  };
  // get base URL for graphQL queries
  const baseURL = "http://localhost:9999/";
  const TMDBPageSettings = {
    1: "category",
    2: "category_value",
    3: "season",
    4: "season_value",
    5: "episode",
    6: "episode_value",
  };

  const spinnerHTML = `<div id="performers-loading-spinner"><img src=""></div>`;
  const dimOverlayHTML = `<div id="performers-dim-overlay"></div>`;
  document.body.insertAdjacentHTML("beforeend", spinnerHTML);
  document.body.insertAdjacentHTML("beforeend", dimOverlayHTML);

  console.log(window.location.pathname);

  const callGQL = (reqData) =>
    fetch(`${baseURL}graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqData),
    })
      .then((res) => res.json())
      .then((res) => res.data);

  async function PersonPage(pageObj) {
    console.log("PersonPage:start");
    pageObj.stashData = await getStashData(
      "performerbyname",
      pageObj.pageTitle
    );
    console.log("pageObj", pageObj);
    pageObj.tmdbData = await getTmdbData(pageObj.scenarioID);
    const analyzePage = await analyzePageData(pageObj);
    console.log("pageObj", pageObj);
    console.log("PersonPage:end");
  }

  async function MoviePage(pageObj) {
    console.log("MoviePage:start");
    console.log("pageObj", pageObj);
    pageObj.stashData = await getStashData("groupsbyurl", pageObj.scenarioUrl);
    console.log("pageObj", pageObj);
    pageObj.tmdbData = await getTmdbData(pageObj.scenarioID);
    const analyzePage = await analyzePageData(pageObj);
    console.log("pageObj", pageObj);
    console.log("MoviePage:end");
  }

  async function TvPage(pageObj) {
    console.log("TvPage:start");
    console.log("pageObj", pageObj);
    pageObj.stashData = await getStashData("groupsbyurl", pageObj.scenarioUrl);
    console.log("pageObj", pageObj);
    pageObj.tmdbData = await getTmdbData(pageObj.scenarioID);
    console.log("pageObj", pageObj);
    const analyzePage = await analyzePageData(pageObj);
    console.log("pageObj", pageObj);
    console.log("TvPage:end");
  }

  async function TvSeasonsPage(pageObj) {
    console.log("TvSeasonsPage:start");
    pageObj.stashData = await getStashData("groupsbyurl", pageObj.scenarioUrl);
    console.log("pageObj", pageObj);
    pageObj.tmdbData = await getTmdbData(pageObj.scenarioID);
    console.log("pageObj", pageObj);
    const analyzePage = await analyzePageData(pageObj);
    console.log("pageObj", pageObj);
    console.log("TvSeasonsPage:end");
  }

  async function TvSeasonPage(pageObj) {
    console.log("TvSeasonPage:start");
    pageObj.stashData = await getStashData("groupsbyurl", pageObj.scenarioUrl);
    console.log("pageObj", pageObj);

    pageObj.tmdbData = await getTmdbData(pageObj.scenarioID);
    console.log("pageObj", pageObj);
    const analyzePage = await analyzePageData(pageObj);
    console.log("pageObj", pageObj);
    console.log("TvSeasonPage:end");
  }

  async function TvSeasonEpisodePage(pageObj) {
    console.log("TvSeasonEpisodePage:start");
    pageObj.stashData = await getStashData("groupsbyurl", pageObj.scenarioUrl);
    console.log("pageObj", pageObj);
    pageObj.tmdbData = await getTmdbData(pageObj.scenarioID);
    console.log("pageObj", pageObj);
    const analyzePage = await analyzePageData(pageObj);
    console.log("pageObj", pageObj);
    console.log("TvSeasonEpisodePage:end");
  }

  async function analyzePageData(pageobj) {
    console.log("analyzePageData");
    var actionData = {};
    var recordCount = 0;
    const tmdbData = pageobj.tmdbData;
    const pagetitle = pageobj.pagetitle;
    var stashData = {};
    var missingInfo = {};
    var buttonId = "";
    var buttonText = "";
    var buttonData = {};
    var targetElement = pageobj.selector;

    switch (pageobj.scenarioID) {
      // 1: PersonPage
      case 1:
        buttonId = "EventbuttonId_" + pageobj.scenarioID;
        console.log("scenarioID :", pageobj.scenarioID);
        stashData = pageobj.stashData.findPerformers;

        const tmdbPersonobj = tmdbData.stashobj;
        var stashPersonobj = {};

        console.log("stashdata", stashData);
        recordCount = stashData.count;
        console.log("stashdata recordCount", recordCount);
        if (recordCount == 1) {
          stashPersonobj = stashData.performers[0];
          console.log("stashPerson", stashPersonobj);
          console.log("tmdbPerson", tmdbData.stashobj);
          missingInfo = ComparePersonObjects(stashPersonobj, tmdbPersonobj);
          console.log("missingInfo", missingInfo);
          if (isEmpty(missingInfo)) {
            console.log("No missingInfo");
            //view
            buttonText = "View";
            buttonData.actionType = "view";
            var bd = {};
            bd.url = pageobj.stashBaseUrl + stashPersonobj.id;
            buttonData.actionData = bd;
          } else {
            console.log("missingInfo", missingInfo);
            //update
            missingInfo.id = stashPersonobj.id;
            buttonText = "Update";
            buttonData.actionType = "performerUpdate";
            buttonData.actionData = missingInfo;
          }
        } else if (recordCount == 0) {
          //add
          buttonText = "Create";
          buttonData.actionType = "performerCreate";
          buttonData.actionData = tmdbPersonobj;
        }

        var my_data_str = JSON.stringify(buttonData, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });

        if (!document.getElementById(buttonId)) {
          targetElement.insertBefore(
            createStashActionButton(buttonId, buttonText, my_data_str),
            targetElement.lastchild
          );
        }
        highlightGroupsExistinStash(stashData);
        break;
      // 2: Movie Page and Tv Page
      case 2:
      case 3:
        buttonId = "EventbuttonId_" + pageobj.scenarioID;
        console.log("scenarioID :", pageobj.scenarioID);
        stashData = pageobj.stashData.findGroups;
        const tmdbMovieobj = tmdbData.stashobj;

        console.log("stashdata", stashData);
        recordCount = stashData.count;
        console.log("stashdata record Count", recordCount);
        if (recordCount > 0) {
          var stashGroupObj = stashData.groups[0];

          console.log("stashGroup", stashGroupObj);
          console.log("tmdbGroup", tmdbData.stashobj);
          console.log("CompareGroupObjects movie & TV");
          missingInfo = CompareGroupObjects(
            pageobj.scenarioID,
            stashGroupObj,
            tmdbMovieobj
          );
          console.log("missingInfo", missingInfo);
          if (isEmpty(missingInfo)) {
            console.log("No missingInfo");
            //view
            buttonText = "View";
            buttonData.actionType = "view";
            var bd = {};
            bd.url = pageobj.stashBaseUrl + stashGroupObj.id;
            buttonData.actionData = bd;
          } else {
            console.log("missingInfo", missingInfo);
            //update
            missingInfo.id = stashGroupObj.id;
            buttonText = "Update";
            buttonData.actionType = "groupUpdate";
            buttonData.actionData = missingInfo;
          }
        } else if (recordCount == 0) {
          //add
          buttonText = "Create";
          buttonData.actionType = "groupCreate";
          buttonData.actionData = tmdbMovieobj;
        }

        var my_data_str = JSON.stringify(buttonData, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });

        console.log("targetElement", targetElement);

        if (!document.getElementById(buttonId)) {
          targetElement.insertBefore(
            createStashActionButtonGroup(
              pageobj.scenarioID,
              stashData.groups,
              pageobj.stashBaseUrl,
              buttonId,
              buttonText,
              my_data_str
            ),
            targetElement.firstElementChild
          );
        }

        let personhighlight = await highlightPersonsExistinStashScene(
          pageobj.scenarioID,
          stashData
        );

        break;
      //Seasons Page
      case 4:
        buttonId = "EventbuttonId_" + pageobj.scenarioID;
        console.log("scenarioID :", pageobj.scenarioID);
        stashData = pageobj.stashData.findGroups;
        const seasonsCount = tmdbData.seasonsCount;
        const tmdbSeasonsobj = tmdbData.stashobjs;

        console.log("stashdata", stashData);
        recordCount = stashData.count;
        console.log("stashdata record Count", recordCount);
        console.log("season Count", seasonsCount);

        var stashTvGroupObj = stashData.groups.filter(
          (x) => x.urls[0] == pageobj.scenarioUrl
        );
        var tvGroupObj = {};
        console.log("stashTvGroupObj", stashTvGroupObj);

        if (stashTvGroupObj.length > 0) {
          var tvparentGroupObj = stashTvGroupObj[0];

          tvGroupObj.group_id = tvparentGroupObj.id;

          console.log("tvGroupObj", tvGroupObj);

          for (let i = 0; i <= seasonsCount - 1; i++) {
            var tmdbobj = {};
            console.log("season:", i + 1);
            tmdbobj = tmdbSeasonsobj[i];
            console.log("tmdbobj", tmdbobj);

            var seasonUrl = tmdbobj.urls[0];
            var stashGroupObj = stashData.groups.filter(
              (x) => x.urls[0] == seasonUrl
            );

            if (stashGroupObj.length > 0) {
              if (isEmpty(tvGroupObj)) {
                console.log("No Parent groups");
              } else {
                console.log("Adding Parent groups");
                tmdbobj.containing_groups = tvGroupObj;
              }

              console.log("stashGroupObj", stashGroupObj);
              console.log("tmdbobj", tmdbobj);
              console.log("CompareGroupObjects for seasons");

              missingInfo = CompareGroupObjects(
                pageobj.scenarioID,
                stashGroupObj[0],
                tmdbobj
              );
              console.log("missingInfo", missingInfo);
              if (isEmpty(missingInfo)) {
                console.log("No missingInfo");
                //view
                buttonText = "View";
                buttonData.actionType = "view";
                var bd = {};
                bd.url = pageobj.stashBaseUrl + stashGroupObj[0].id;
                buttonData.actionData = bd;
              } else {
                console.log("missingInfo", missingInfo);
                //update
                missingInfo.id = stashGroupObj[0].id;
                buttonText = "Update";
                buttonData.actionType = "groupUpdate";
                buttonData.actionData = missingInfo;
              }
            } else if (stashGroupObj.length == 0) {
              if (isEmpty(tvGroupObj)) {
                console.log("No Parent groups");
              } else {
                console.log("Adding Parent groups");
                tmdbobj.containing_groups = tvGroupObj;
              }

              console.log("stashGroupObj", stashGroupObj);
              console.log("tmdbobj", tmdbobj);
              console.log("Missing add to stash", tmdbobj);
              buttonText = "Create";
              buttonData.actionType = "groupCreate";
              buttonData.actionData = tmdbobj;
            }

            var my_data_str = JSON.stringify(buttonData, (key, value) => {
              if (!isNaN(value)) value = Number(value);
              return value;
            });

            const seasons_info = document.getElementsByClassName("season");
            targetElement = seasons_info[i].querySelectorAll("h2")[0];
            buttonId = buttonId + "_" + i;

            console.log("targetElement", targetElement);

            if (!document.getElementById(buttonId)) {
              targetElement.insertBefore(
                createStashActionButton(buttonId, buttonText, my_data_str),
                targetElement.firstElementChild
              );
            }
          }
        } else {
          console.log("tv group missing.Create Tv group first");
        }
        break;
      case 5:
      case 6:
        buttonId = "EventbuttonId_" + pageobj.scenarioID;
        console.log("scenarioID :", pageobj.scenarioID);
        stashData = pageobj.stashData.findGroups;
        const episodesCount = tmdbData.episodesCount;
        const tmdbEpisodesobj = tmdbData.stashobjs;

        console.log("stashdata", stashData);
        recordCount = stashData.count;
        console.log("stashdata record Count", recordCount);
        console.log("season Count", episodesCount);

        //get page url pageObj.pageParentUrl

        var stashTvSeasonGroupObj = stashData.groups.filter(
          (x) => x.urls[0] == pageobj.pageParentUrl
        );
        var tvGroupObj = {};

        var tvSeasonGroupObj = {};
        var seasonName = "";

        //check for season profile if it doesn't exist dont create episodes

        if (stashTvSeasonGroupObj.length > 0) {
          tvGroupObj = stashTvSeasonGroupObj[0];

          tvSeasonGroupObj.group_id = tvGroupObj.id;
          seasonName = tvGroupObj.name;

          for (let i = 0; i <= episodesCount - 1; i++) {
            var tmdbobj = {};
            console.log("season:", i + 1);
            tmdbobj = tmdbEpisodesobj[i];
            tmdbobj.name = seasonName + ":" + tmdbobj.name;
            tmdbobj.containing_groups = tvSeasonGroupObj;
            console.log("tmdbobj", tmdbobj);

            var episodeUrl = tmdbobj.urls[0];

            var stashGroupObj = stashData.groups.filter(
              (x) => x.urls[0] == episodeUrl
            );

            if (stashGroupObj.length > 0) {
              console.log("stashGroupObj", stashGroupObj);
              console.log("tmdbobj", tmdbobj);
              console.log("CompareGroupObjects TV season and episode");
              missingInfo = CompareGroupObjects(
                pageobj.scenarioID,
                stashGroupObj[0],
                tmdbobj
              );
              console.log("missingInfo", missingInfo);
              if (isEmpty(missingInfo)) {
                console.log("No missingInfo");
                //view
                buttonText = "View";
                buttonData.actionType = "view";
                var bd = {};
                bd.url = pageobj.stashBaseUrl + stashGroupObj[0].id;
                buttonData.actionData = bd;
              } else {
                console.log("missingInfo", missingInfo);
                //update
                missingInfo.id = stashGroupObj[0].id;
                buttonText = "Update";
                buttonData.actionType = "groupUpdate";
                buttonData.actionData = missingInfo;
              }
            } else if (stashGroupObj.length == 0) {
              console.log("Missing add to stash", tmdbobj);

              buttonText = "Create";
              buttonData.actionType = "groupCreate";
              buttonData.actionData = tmdbobj;
            }

            var my_data_str = JSON.stringify(buttonData, (key, value) => {
              if (!isNaN(value)) value = Number(value);
              return value;
            });

            const episodes_info =
              document.getElementsByClassName("episode_list");
            const episodescards = episodes_info[0].querySelectorAll(".card");

            targetElement = episodescards[i].querySelectorAll("h3")[0];
            buttonId = buttonId + "_" + i;

            console.log("targetElement", targetElement);

            if (!document.getElementById(buttonId)) {
              if (buttonText != "Create") {
                targetElement.insertBefore(
                  createStashActionButtonGroup(
                    pageobj.scenarioID,
                    stashGroupObj,
                    pageobj.stashBaseUrl,
                    buttonId,
                    buttonText,
                    my_data_str
                  ),
                  targetElement.firstElementChild
                );
              } else {
                targetElement.insertBefore(
                  createStashActionButton(buttonId, buttonText, my_data_str),
                  targetElement.lastchild
                );
              }
            }
          } //for loop
        } else {
          console.log(
            "Season is missing,Create season beore creating episodes"
          );
        }
        break;
    }

    return true;
  }

  function waitforClass(selector, callback) {
    var el = document.getElementsByClassName(selector);
    if (el) return callback(el);
    setTimeout(waitforClass, 100, selector, callback);
  }

  function waitForElement(selector, callback) {
    console.log("waitForElement:Start");
    console.log("waitForElement:selector", selector);
    let pageObj = getTmdbPageCategory();
    let pageTitle = "";
    let pageParentUrl = "";
    if (!document.getElementById("copy-stashid")) {
      console.log("copy-stashid not found");

      pageObj.selector = selector;
      var pageTitleElement = selector.querySelectorAll("h2");

      if (pageTitleElement.length != 0) {
        pageTitle = pageTitleElement[0].innerText;
      } else {
        pageTitle = "";
      }

      var titlelink = selector.querySelectorAll("a")[0];
      pageParentUrl = titlelink.href;
      pageObj.pageParentUrl = pageParentUrl;
      pageObj.pageTitle = getTitle(pageObj.scenarioID);

      if (pageObj.scenarioID == 1) {
        //pageObj.pageTitle = pageTitle;
        pageObj.stashBaseUrl = baseURL + "performers/";
      } else {
        //if (pageTitle.split("(")[0]) {
        //pageObj.pageTitle = pageTitle.split("(")[0].trim();
        pageObj.stashBaseUrl = baseURL + "groups/";
        ///}
      }

      switch (pageObj.scenarioID) {
        case 1:
          PersonPage(pageObj);
          break;

        case 2:
          MoviePage(pageObj);
          break;
        case 3:
          TvPage(pageObj);
          break;
        case 4:
          TvSeasonsPage(pageObj);
          break;
        case 5:
          TvSeasonPage(pageObj);
          break;
        case 6:
          TvSeasonEpisodePage(pageObj);
          break;
      }
    }
  }

  const PathElementListener = (path, element, callback) => {
    // startup location
    if (window.location.pathname.startsWith(path))
      waitForElement(element, callback);
  };
  const PathIncludesElementListener = (path, element, callback) => {
    // startup location
    if (window.location.pathname.includes(path))
      waitforClass(element, callback);
  };
  const PathStartwithElementListener = (path, element, callback) => {
    // startup location
    if (window.location.pathname.startsWith(path))
      waitForElement(element, callback);
  };

  const PageProcessor = () => {
    console.log("PageProcessor:Start");
    let target = document.querySelector(".title");
    waitForElement(target, (element) => {
      // Check if an icon is already added to prevent duplicates
      if (element.querySelector(".resolution-icon")) {
        return;
      }
    });
    console.log("PageProcessor:End");
  };

  // export to window
  const csLib = {
    baseURL,
    callGQL,
    waitForElement,
    waitforClass,
    PathElementListener,
    PathStartwithElementListener,
    PathIncludesElementListener,
    PageProcessor,
  };

  addGlobalStyle(
    ".btn { display: inline-flex;  align-content: center;  align-items: center;  border-radius: 20px;  padding: .25rem 1rem;  background-color: rgba(1,188,228,1); color: rgb(255 255 255/var(--tw-text-opacity, 1));  cursor: pointer;  margin-right:10px;  margin-left:10px; }"
  );

  addGlobalStyle(
    '#performers-custom-popup{position:absolute;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);border:1px solid #ccc;z-index:10001;padding:20px;box-shadow:0 0 10px rgba(0,0,0,0.5);width:500px;max-height:80%;overflow-y:auto}#performers-custom-popup h2{margin-top:0;cursor:move}#performers-custom-popup form label{display:block;margin-top:10px}#performers-custom-popup form input,#performers-custom-popup form select{width:100%;padding:8px;margin-top:5px;box-sizing:border-box}#performers-custom-popup form button{margin-top:15px;padding:10px;cursor:pointer;background:rgba(0,0,0,0.5);color:#fff}#performers-custom-popup input[type="text"],#performers-custom-popup select{color:black}#performers-custom-menu{background-color:#000;background:rgba(0,0,0,0.3);box-shadow:0 0 10px rgba(0,0,0,0.5);backdrop-filter:blur(10px);position:absolute;border:1px solid #ccc;z-index:10000;padding:10px}#performers-custom-menu a{display:block;margin-bottom:5px;color:white}#performers-tag-popup{position:absolute;background:rgba(0,0,0,0.5);border:1px solid #ccc;z-index:10002;padding:20px;box-shadow:0 0 10px rgba(0,0,0,0.5);width:500px;max-height:80%;overflow-y:auto}#performers-tag-popup h2{margin-top:0}#performers-tag-popup #performers-tag-table{height:300px}#performers-tag-popup form button{margin-top:15px;padding:10px;cursor:pointer;background:rgba(0,0,0,0.5);color:#fff;width:100%}#performers-tag-search{color:black}.performers-tag-close{position:absolute;top:10px;right:15px;font-size:28px;font-weight:bold;color:white;cursor:pointer;z-index:10003}.performers-tag-close:hover{color:red}.recent-tag{cursor:pointer;padding:5px;margin:3px 0;background-color:rgba(255,255,255,0.2);border-radius:4px}.recent-tag.selected{background-color:rgba(255,255,255,0.7);color:black;font-weight:bold}.performers-custom-modal{display:none;position:fixed;z-index:10001;left:0;top:0;width:100%;height:100%;overflow:auto;color:white;background-color:rgba(0,0,0,0.5)}.performers-custom-modal-content{background:rgba(0,0,0,0.5);margin:5% auto;padding:20px;border:1px solid #888;width:80%;max-width:1000px;max-height:80vh;overflow-y:auto}.performers-custom-close{color:#aaa;float:right;font-size:28px;font-weight:bold}.performers-custom-close:hover,.performers-custom-close:focus{color:black;text-decoration:none;cursor:pointer}#performers-custom-imageGallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px}.performers-custom-image-option-container{position:relative;display:inline-block}.performers-image-dimensions{position:absolute;bottom:5px;left:5px;background-color:rgba(0,0,0,0.6);color:white;padding:2px 5px;font-size:10px;border-radius:3px}.performers-custom-image-option{width:100px;height:150px;object-fit:cover;cursor:pointer;border:2px solid transparent}.performers-custom-image-option.selected{border-color:#007bff}#performers-custom-applyImage{display:block;margin:10px auto;padding:10px 20px;background-color:#007bff;color:white;border:none;cursor:pointer}#performers-custom-pagination-controls{text-align:center;margin-top:10px}.performers-custom-page-link{margin:0 5px;cursor:pointer;color:#007bff;background:rgba(0,0,0,0);text-decoration:underline}.performers-custom-scene-option{cursor:pointer;border-bottom:1px solid #ccc;padding:10px;display:flex;flex-direction:column;align-items:center}.performers-custom-scene-option h3{margin:0;font-size:12px;text-align:center}.performers-custom-scene-option img{max-width:100%;height:auto}.performers-custom-scene-option p,.performers-custom-scene-option a{margin:5px 0;font-size:12px;text-align:center}#performers-custom-sceneGallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#performers-loading-spinner{display:none;position:fixed;z-index:10002;left:50%;top:50%;transform:translate(-50%,-50%);width:200px;height:300px;background-color:rgba(0,0,0,0.5);border-radius:25%;overflow:hidden}#performers-loading-spinner img{position:absolute;width:100%;height:100%;object-fit:contain;opacity:0;animation:fadeIn 1s forwards}@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}#performers-loading-spinner .performers-loading-header{position:absolute;bottom:10px;width:100%;text-align:center;color:white;font-size:18px;font-weight:bold}@keyframes bookSlide{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}#performers-dim-overlay{display:none;position:fixed;z-index:10001;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5)}.performers-loading-header{outline:1px solid black;background:rgba(0,0,0,0.5)}'
  );

  addGlobalStyle(
    '#search-display-custom-popup{position:absolute;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);border:1px solid #ccc;z-index:10001;padding:20px;box-shadow:0 0 10px rgba(0,0,0,0.5);width:500px;max-height:80%;overflow-y:auto}#search-display-custom-popup h2{margin-top:0;cursor:move}#search-display-custom-popup form label{display:block;margin-top:10px}#search-display-custom-popup form input,#search-display-custom-popup form select{width:100%;padding:8px;margin-top:5px;box-sizing:border-box}#search-display-custom-popup form button{margin-top:15px;padding:10px;cursor:pointer;background:rgba(0,0,0,0.5);color:#fff}#search-display-custom-popup input[type="text"],#search-display-custom-popup select{color:black}#search-display-custom-menu{background-color:#000;background:rgba(0,0,0,0.3);box-shadow:0 0 10px rgba(0,0,0,0.5);backdrop-filter:blur(10px);position:absolute;border:1px solid #ccc;z-index:10000;padding:10px}#search-display-custom-menu a{display:block;margin-bottom:5px;color:white}#search-display-tag-popup{position:absolute;background:rgba(0,0,0,0.5);border:1px solid #ccc;z-index:10002;padding:20px;box-shadow:0 0 10px rgba(0,0,0,0.5);width:500px;max-height:80%;overflow-y:auto}#search-display-tag-popup h2{margin-top:0}#search-display-tag-popup #search-display-tag-table{height:300px}#search-display-tag-popup form button{margin-top:15px;padding:10px;cursor:pointer;background:rgba(0,0,0,0.5);color:#fff;width:100%}#search-display-tag-search{color:black}.search-display-tag-close{position:absolute;top:10px;right:15px;font-size:28px;font-weight:bold;color:white;cursor:pointer;z-index:10003}.search-display-tag-close:hover{color:red}.recent-tag{cursor:pointer;padding:5px;margin:3px 0;background-color:rgba(255,255,255,0.2);border-radius:4px}.recent-tag.selected{background-color:rgba(255,255,255,0.7);color:black;font-weight:bold}.search-display-modal{display:none;position:fixed;z-index:10001;left:0;top:0;width:100%;height:100%;overflow:auto;color:white;background-color:rgba(0,0,0,0.5)}.search-display-modal-content{background:rgba(0,0,0,0.5);margin:5% auto;padding:20px;border:1px solid #888;width:80%;max-width:1000px;max-height:80vh;overflow-y:auto}.search-display-close{color:#aaa;float:right;font-size:28px;font-weight:bold}.search-display-close:hover,.search-display-close:focus{color:black;text-decoration:none;cursor:pointer}#search-display-imageGallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px}.search-display-image-option-container{position:relative;display:inline-block}.search-display-image-dimensions{position:absolute;bottom:5px;left:5px;background-color:rgba(0,0,0,0.6);color:white;padding:2px 5px;font-size:10px;border-radius:3px}.search-display-image-option{width:100px;height:150px;object-fit:cover;cursor:pointer;border:2px solid transparent}.search-display-image-option.selected{border-color:#007bff}#search-display-applyImage{display:block;margin:10px auto;padding:10px 20px;background-color:#007bff;color:white;border:0;cursor:pointer}#search-display-pagination-controls{text-align:center;margin-top:10px}.search-display-page-link{margin:0 5px;cursor:pointer;color:#007bff;background:rgba(0,0,0,0);text-decoration:underline}.search-display-item-option{cursor:pointer;border-bottom:1px solid #ccc;padding:10px;display:flex;flex-direction:column;align-items:center}.search-display-item-option h3{margin:0;font-size:12px;text-align:center}.search-display-item-option img{max-width:100%;height:auto}.search-display-item-option p,.search-display-item-option a{margin:5px 0;font-size:12px;text-align:center}#search-display-itemGallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#search-display-loading-spinner{display:none;position:fixed;z-index:10002;left:50%;top:50%;transform:translate(-50%,-50%);width:200px;height:300px;background-color:rgba(0,0,0,0.5);border-radius:25%;overflow:hidden}#search-display-loading-spinner img{position:absolute;width:100%;height:100%;object-fit:contain;opacity:0;animation:fadeIn 1s forwards}@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}#search-display-loading-spinner .search-display-loading-header{position:absolute;bottom:10px;width:100%;text-align:center;color:white;font-size:18px;font-weight:bold}@keyframes bookSlide{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}#search-display-dim-overlay{display:none;position:fixed;z-index:10001;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5)}.search-display-loading-header{outline:1px solid black;background:rgba(0,0,0,0.5)}'
  );


  addGlobalStyle('.search-display-modal-content{margin:5% auto;width:80%;max-width:1000px;max-height:80vh;overflow-y:auto;background:linear-gradient(135deg,#2a2a2a 0%,#1a1a1a 40%,#0a0a0a 100%);border:1px solid #444;border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.1);backdrop-filter:blur(10px);pointer-events:auto}.popup-header{position:relative;font-weight:bold;margin-bottom:12px;color:#fff;border-bottom:2px solid #444;padding-bottom:6px;display:flex;justify-content:space-between;align-items:center}.popup-header-title{font-weight:bold}');

  csLib.PageProcessor();
  csLib.PathIncludesElementListener(
    "/episode/",
    "episode opened",
    highlightEpisodeCast
  );

  function highlightEpisodeCast() {
    console.log("on Episode Page");
    alert("I am here");
  }
  //Functions
  async function highlightGroupsExistinStash(performersData) {
    console.log("highlightGroupsExistinStash");
    const performers = performersData.performers;
    console.log(performers);

    var movie_list = [];
    var unique_groups = [];

    for (let i = 0; i < performers.length; i++) {
      let objectsArray = performers[i].groups;
          console.log('objectsArray',objectsArray);


      for (let obj of objectsArray) {

        let groupUrls=obj.urls;
        console.log('groupUrls length:',groupUrls.length);

        if(groupUrls.length > 0)
          {

        let groupurl = obj.urls[0];

        if(groupurl.includes('season'))
          {

            let tvurl=groupurl.split('/season')[0];
            console.log(tvurl);
            movie_list.push(tvurl);

          }
        movie_list.push(groupurl);
          }

      }

      // console.log("movie_list", movie_list);
      unique_groups = [...new Set(movie_list)];
    }

    const PerformerCredits = document.getElementsByClassName("credits_list")[0];
    const PerformerMovies = PerformerCredits.querySelectorAll("a");

    for (let i = 0; i < PerformerMovies.length; i++) {
      let anchor = PerformerMovies[i];
      let a_link = anchor.href;
      if (unique_groups.includes(a_link)) {
        anchor.parentElement.setAttribute(
          "style",
          "background-color: rgba(1,180,228,1);"
        );
      }
    }
    return true;
  }
  async function highlightPersonsExistinStashScene(scenarioID, stashData) {
    let per_urls = [];
    let per_scenes = [];
    let scene_performers = [];
    var TMDB_PerformerMovieData = {};
    var buttonText = "";
    var buttonData = {};
    var buttonId = "";
    var Performercards = [];
    if (scenarioID == 2 || scenarioID == 3) {
      Performercards = document
        .getElementById("cast_scroller")
        .querySelectorAll(".card");
    } else {
      const Performerstable = document.getElementsByClassName("guest_stars");
      if (Performerstable.length != 0) {
        Performercards = Performerstable[0].querySelectorAll(".info");
      }
    }

    if (Performercards.length > 0) {
      console.log("highlightPersonsExistinStashScene", stashData);

      var stashgroups = stashData.groups;
      /*console.log("stashgroups",stashgroups);
        for(let i=0;i<=stashgroups.length-1;i++)
      {
        console.log("stashgroup ",stashgroups[i]['scenes']);


      }*/
      for (let i = 0; i <= stashgroups.length - 1; i++) {
        var group_scenes = stashgroups[i].scenes;
        for (let i = 0; i < group_scenes.length; i++) {
          per_scenes.push(group_scenes[i].id);
          let performer_inscene = group_scenes[i].performers;
          for (let j = 0; j < performer_inscene.length; j++) {
            let url = performer_inscene[j].urls[0];
            per_urls.push(url);
            scene_performers.push(performer_inscene[j].id);
          }
        }
      }

      let unique_actor_url = [...new Set(per_urls)];
      let unique_scenes = [...new Set(per_scenes)];
      console.log("unique_actor_url", unique_actor_url);
      console.log("unique_scenes", unique_scenes);
      console.log("scene_performers", scene_performers);
      var scene_id = 0;
      if (unique_scenes.length == 1) {
        scene_id = unique_scenes[0];
      }

      //console.log("Performercards", Performercards);
      for (let i = 0; i < Performercards.length; i++) {
        let actor_link = Performercards[i].querySelectorAll("a");

        let Targetelement = actor_link[0];
        let actor_link_href = Targetelement.href;

        if (per_urls.includes(actor_link_href)) {
          actor_link[0].parentElement.setAttribute(
            "style",
            "background-color: #d5f5e3;"
          );
        } else {
          if (scene_id != 0) {
            var per_info = {};
            let tmdb_id = actor_link_href.split("/").pop();
            per_info["tmdb_id"] = tmdb_id;
            per_info["scene_id"] = scene_id;
            per_info["performerids"] = scene_performers;

            var scenarioActionId = "performer_" + tmdb_id;
            var scenarioActionTitle = "Add";
            var sceneInfo = {};
            sceneInfo.action = "addPerformertoscene";
            sceneInfo.scenarioType = 7;
            sceneInfo.scenarioActionType = 7;
            sceneInfo.scenarioData = per_info;

            buttonText = "Add";
            buttonData.actionType = "addPerformertoscene";
            buttonData.actionData = per_info;

            var my_data_str = JSON.stringify(buttonData, (key, value) => {
              if (!isNaN(value)) {
                if (typeof value == "number") {
                  value = Number(value);
                }
              }
              return value;
            });

            //addPerformerToSceneButton(tmdb_id, "Add", my_scene_data_str),
            // console.log('Movie page add performer button:',my_scene_data_str)
            Targetelement.parentElement.insertBefore(
              createStashActionButton(buttonId, buttonText, my_data_str),
              Targetelement.lastchild
            );
            // console.log("match not found", Targetelement);
          }
        }
      }
    }

    return true;
  }

  function ComparePersonObjects(stash_data, tmdb_data) {
    //add mising value
    tmdb_data.id = stash_data.id;

    var missinginfo = {};
    var keys = Object.keys(stash_data);
    keys.forEach((key) => {
      console.log("key : ", key);
      console.log("stash_data[key]", stash_data[key]);
      console.log("tmdb_data[key]", tmdb_data[key]);
      if (key == "groups") {
        console.log("skip groups");
      } else if (key == "image_path") {
        //check profile img
        console.log("image_path", stash_data[key]);
        let tmdbImgKey = "image";
        const imagepath = stash_data[key];
        const qparams = new URL(imagepath).searchParams;

        if (qparams.has("default")) {
          missinginfo[tmdbImgKey] = tmdb_data[tmdbImgKey];
        }
      } else {
        if (tmdb_data.hasOwnProperty(key)) {
          //key exist.compare
          if (key == "urls") {
            //handle array
            var stashArray = stash_data[key];
            var tmdbArray = tmdb_data[key];
            const updatedArray2 = tmdbArray.filter(
              (item) => !stashArray.includes(item)
            );
            if (updatedArray2.length > 0) {
              missinginfo[key] = updatedArray2;
            }
          } else if (key == "custom_fields") {
            var stash_custom = stash_data.custom_fields;
            var tmdb_custom = tmdb_data.custom_fields;

            if (stash_custom.hasOwnProperty("tmdb_id")) {
              var custom_fields = {};
              var partial = {};
              if (stash_custom["tmdb_id"] != tmdb_custom["tmdb_id"]) {
                partial.tmdb_id = tmdb_custom["tmdb_id"];
                custom_fields.partial = partial;
                missinginfo[key] = custom_fields;
              }
            } else {
              var missing_custom_fields = {};
              partial.tmdb_id = tmdb_custom["tmdb_id"];
              custom_fields.partial = partial;
              missinginfo[key] = custom_fields;
            }
          } else {
            console.log("other key", key);
            //not same value use it from
            if (stash_data[key] != tmdb_data[key]) {
              console.log("missing key", key);
              console.log("stash_data[key]", stash_data[key]);
              console.log("tmdb_data[key]", tmdb_data[key]);
              missinginfo[key] = tmdb_data[key];
            }
          }
        }
      }
    });
    return missinginfo;
  }
  function CompareGroupObjects(scenarioID, stash_rawdata, tmdb_data) {
    console.log("Function CompareGroupObjects");
    const stash_data = createGroupObjMapping(scenarioID, stash_rawdata);
    tmdb_data.id = stash_data.id;
    console.log("CompareGroupObjects stash_data", stash_data);
    console.log("CompareGroupObjects tmdb_data", tmdb_data);
    var missinginfo = {};
    var keys = Object.keys(stash_data);
    keys.forEach((key) => {
      console.log("key : ", key);
      console.log("stash_data[key]", stash_data[key]);
      console.log("tmdb_data[key]", tmdb_data[key]);
      if (key == "urls") {
        let diff_urls = difference(stash_data[key], tmdb_data[key]);
        console.log("diff_urls", diff_urls);
        if (diff_urls.length > 0) {
          let stash_urls = stash_data[key];
          for (let i = 0; i <= diff_urls.length; i++) {
            stash_urls.push(diff_urls[i]);
          }
          missinginfo[key] = stash_urls;
        }
      } else if (key == "front_image") {
        console.log("check for default img");

        let stash_url = stash_data[key];
        if (stash_url.includes("default=true")) {
          missinginfo[key] = tmdb_data[key];
        }
      } else if (key == "containing_groups") {
        let diff_group = difference(stash_data[key], tmdb_data[key]);
        if (!isEmpty(diff_group)) {
          console.log("missing parent grp ", diff_group);
          missinginfo[key] = diff_group;
        }
      } else if (stash_data[key] != tmdb_data[key]) {
        console.log("missing key", key);
        console.log("stash_data[key]", stash_data[key]);
        console.log("tmdb_data[key]", tmdb_data[key]);
        if (hasvalidValue(tmdb_data[key])) {
          missinginfo[key] = tmdb_data[key];
        }
      }
    });

    return missinginfo;
  }
  function createGroupObjMapping(scenarioID, stashGroupData) {
    var StashGroupObj = {};
    StashGroupObj.name = stashGroupData.name;
    StashGroupObj.aliases = stashGroupData.aliases;
    StashGroupObj.urls = stashGroupData.urls;
    StashGroupObj.synopsis = stashGroupData.synopsis;
    StashGroupObj.date = stashGroupData.date;
    StashGroupObj.front_image = stashGroupData.front_image_path;
    //containing_groups
    if (scenarioID != 2) {
      var containing_groups = {};
      console.log(
        "Create object map containing_groups",
        stashGroupData.containing_groups
      );
      var group_id = 0;
      var con_grp = stashGroupData.containing_groups;

      if (con_grp.length == 0) {
        containing_groups.group_id = 0;
      } else {
        var cg = con_grp[0].group;
        containing_groups.group_id = cg.id;
      }
      StashGroupObj.containing_groups = containing_groups;
    }
    return StashGroupObj;
  }

  function CreatedisplayObject(groupsceneData) {
    const s_group_id = groupsceneData.gid;
    const s_group_date = groupsceneData.gdate;
    const s_group_scenes = groupsceneData.scenes;
    var scenesingroup = [];
    var change_count = 0;
    var bulkupdate=false;
     let bulkIds=[];


    if (hasvalidValue(s_group_date)) {
      bulkupdate=true;
       console.log('group date:',s_group_date);
    }

    var groupscenesObj = [];
    for (let i = 0; i <= s_group_scenes.length - 1; i++) {
      var group_sceneitem = {};
      let buttonData = {};
      let sceneInput = {};


      var scene_id=s_group_scenes[i].id;

      group_sceneitem.item_id = scene_id;
      group_sceneitem.item_title = s_group_scenes[i].title;
      group_sceneitem.item_img = s_group_scenes[i].paths.screenshot;

      if (hasvalidValue(s_group_scenes[i].performers.length)) {
      group_sceneitem.actress_count=s_group_scenes[i].performers.length;
      }
      else
        {
          group_sceneitem.actress_count=0;
        }

      var scene_date=s_group_scenes[i].date;


      console.log('scene date:',scene_date);

      if (hasvalidValue(s_group_date)) {
        if (hasvalidValue(scene_date) && scene_date !=0) {
          group_sceneitem.item_date = scene_date;
        } else {
          group_sceneitem.item_date = s_group_date;
          bulkIds.push(scene_id);
          change_count = change_count + 1;
        }
      }

      var group_item_index = s_group_scenes[i].groups[0].scene_index;

      if (hasvalidValue(group_item_index)) {
        group_sceneitem.item_index = group_item_index;
      }
      else
        {
          group_sceneitem.item_index = '';

        }



      buttonData.actionType = "sceneUpdate";
      var actionElement = {};
      actionElement.Type = "scenetogroup";
      actionElement.targetElementId = "item_container_" + s_group_scenes[i].id;
      buttonData.actionElement = actionElement;
      buttonData.actionData = sceneInput;
      var my_data_str = JSON.stringify(buttonData, (key, value) => {
        if (!isNaN(value)) value = Number(value);
        return value;
      });

      group_sceneitem.item_data = my_data_str;
      group_sceneitem.item_action = "Update";

      var show_button=false;
      if(change_count > 0)
        {
          show_button=true;
        }


      group_sceneitem.actionElement = createStashActionButton(
        s_group_scenes[i].id,
        "Update",
        buttonData,
        show_button
      );
      //console.log('actionElement',my_data_str);

      groupscenesObj.push(group_sceneitem);
    }


      //if(bulkupdate)
    var showbulkupdatebutton=false;

    if (bulkIds.length > 0) {
    showbulkupdatebutton=true;

    }

        var bulk_buttonData={};
        bulk_buttonData.actionType = "bulkSceneUpdate";
        bulk_buttonData.targetElementId = "bulk_updateButton_" + s_group_id;
        var BulkSceneUpdateInput={};
        BulkSceneUpdateInput.ids=bulkIds;
        BulkSceneUpdateInput.date=s_group_date;
        bulk_buttonData.actionData=BulkSceneUpdateInput;

       var my_data_str = JSON.stringify(bulk_buttonData, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });

          groupscenesObj.bulkActionElement = createStashActionButton(
          s_group_id,
          "BulkUpdate",
          my_data_str,
            showbulkupdatebutton
        );







groupscenesObj.bulkupdate=bulkupdate;


    return groupscenesObj;
  }

  function compareScenes(stashDBScenes, pageGroupId) {
    var missingscenes = [];

    var pageGroups = [];
    var pageGroup = {};
    var group = {};
    group.id = pageGroupId.toString();
    pageGroup.group = group;
    pageGroups.push(pageGroup);

    for (let i = 0; i <= stashDBScenes.length - 1; i++) {
      const stashdbscene = stashDBScenes[i];
      const stashDBSceneGroupsobj = stashdbscene.groups;
      console.log("stashDBSceneGroupsobj", stashDBSceneGroupsobj);

      var stashDBSceneGroups=[];
      for(let j=0;j<=stashDBSceneGroupsobj.length-1;j++)
        {
          var tmpsgrp={};
          tmpsgrp.group=stashDBSceneGroupsobj[j].group;
          stashDBSceneGroups.push(tmpsgrp);
        }


      console.log("stashDBSceneGroups", stashDBSceneGroups);
      console.log("pageGroups", pageGroups);
      let diff_grps = difference(stashDBSceneGroups, pageGroups);

      var existingGroups = stashDBSceneGroups.map((a) => parseInt(a.group.id));
      console.log("existingGroups", existingGroups);
      console.log("diff_grps", diff_grps);
      if (diff_grps.length > 0) {
        let missingscene = {};
        let buttonData = {};
        let sceneInput = {};
        let args = [];

        let insertgroup_scenes =
          "INSERT INTO groups_scenes ( group_id, scene_id) VALUES (?, ?)";

        let scenegroup = {};
        /*missingscene.scene_id = stashdbscene.id;
        missingscene.scene_title = stashdbscene.title;
        missingscene.scene_img = stashdbscene.paths.screenshot;
        missingscene.scene_date = stashdbscene.date;
        */

        missingscene.item_id = stashdbscene.id;
        missingscene.item_title = stashdbscene.title;
        missingscene.item_img = stashdbscene.paths.screenshot;
        missingscene.item_date = stashdbscene.date

          if (hasvalidValue(stashdbscene.performers.length)) {
              missingscene.actress_count=stashdbscene.performers.length;
      }
      else
        {
          missingscene.actress_count=0;
        }


        sceneInput.sql = insertgroup_scenes;
        //group_id
        args.push(pageGroupId);
        //scene_id
        args.push(stashdbscene.id);

        sceneInput.args = args;
        //existingGroups.push(pageGroupId)

        //scenegroup.group_id=pageGroupId;
        //scenegroup.group_id=existingGroups;

        //sceneInput.groups=scenegroup;

        buttonData.actionType = "execSQL";
        var actionElement = {};
        actionElement.Type = "scenetogroup";
        actionElement.targetElementId = "item_container_" + stashdbscene.id;
        buttonData.actionElement = actionElement;
        buttonData.actionData = sceneInput;
        var my_data_str = JSON.stringify(buttonData, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });

        missingscene.item_data = my_data_str;
        missingscene.item_action = "Add";
        missingscene.item_display="block;"


        missingscene.actionElement = createStashActionButton(
          stashdbscene.id,
          "Add",
          buttonData
        );
        //console.log('actionElement',my_data_str);

        missingscenes.push(missingscene);
      }
    }

//future BulkUpdate
      var showbulkupdatebutton=false;

       var bulk_buttonData={};
        bulk_buttonData.actionType = "bulkSceneUpdate";
        bulk_buttonData.targetElementId = "bulk_updateButton_" + pageGroupId;
        var BulkSceneUpdateInput={};
        /*
        BulkSceneUpdateInput.ids=bulkIds;
        BulkSceneUpdateInput.date=s_group_date;
        bulk_buttonData.actionData=BulkSceneUpdateInput;
*/
       var my_data_str = JSON.stringify(bulk_buttonData, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });

          missingscenes.bulkActionElement = createStashActionButton(
          pageGroupId,
          "BulkUpdate",
          my_data_str,
            showbulkupdatebutton
        );

    return missingscenes;
  }

  async function ButtonPopupAction(datajson) {
    if (datajson) {
      const parm = datajson.actionData;
      var image = {};
      var images = [];
      //image.url=getImage();
      image = loading_animation;
      images.push(image);

      showLoadingSpinner(images);

      const stashDBScenes = [];
      let page = 1;
      while (true) {

        const resultdata = await getStashData("scenesbygroup", parm);
        const result = resultdata.findScenes;

        stashDBScenes.push(...result.scenes);
        if (stashDBScenes.length >= result.count || result.scenes.length < 25)
          break;
        page++;
      }
 var screenTitle="Search Missing scenes in StashDB - " + parm;
      let missingscenes = compareScenes(stashDBScenes, datajson.groupId);

      console.log("ButtonPopupAction", missingscenes);

      if (missingscenes) {
        //createMissingScenesModal(missingscenes, datajson.groupId);

        createSearchDisplayModal(screenTitle,missingscenes);

        //search-display-modal
        //performers-custom-missingScenesModal
        document.getElementById("search-display-itemsModal").style.display =
          "block";
      } else {
        console.error("Failed to fetch performer details or StashDB scenes");
      }
      hideLoadingSpinner();
    }
  }

  async function ButtonAction(datajson) {
    console.log("Function ButtonAction data", datajson);
    var buttonAction = datajson.actionType;
    var buttonData = datajson.actionData;

    var actionResponse = {};
    var actionElement = {};

    switch (buttonAction) {
      case "addPerformertoscene":
        actionResponse = await addPerformerToScene(buttonData);
        buttonAction = "sceneUpdate";

        break;
      case "performerCreate":
      case "performerUpdate":
      case "groupCreate":
      case "groupUpdate":
      case "sceneUpdate":
        actionResponse = await updateStash(buttonAction, buttonData);
        break;
      case "execSQL":
        actionResponse = await updateStash(buttonAction, buttonData);
        actionElement = datajson.actionElement;
        break;

      case "scenesbygroup":
        actionResponse = await getStashData(buttonAction, buttonData);
        break;
      case "view":
        OpenButtonLink(buttonData.url);
        break;
      case "viewgroupscenes":
        actionResponse = await viewGroupScenesGallery(buttonData);
        break;
      case "bulkSceneUpdate":
        actionResponse = await updateStash(buttonAction, buttonData);
        actionElement = datajson.actionElement;
        break;
    }

    var actionControler = validateResponse(buttonAction, actionResponse);

    if (actionControler.isSuccess) {
      if (buttonAction == "execSQL") {
        UpdateElement(actionElement);
      } else {
        pageReload(actionControler.pagereload);
      }
    } else {
      console.log(actionControler);
    }
  }

  async function viewGroupScenesGallery(groupsceneData) {
    if (groupsceneData.gscene_count > 0) {
      var screenTitle="Scenes in StashDB Group -" + groupsceneData.gname;
      var image = {};
      var images = [];
      //image.url=getImage();
      image = loading_animation;
      images.push(image);

      showLoadingSpinner(images);

      let page = 1;
      /* while (true) {
        const parm = datajson.actionData;
        const resultdata = await getStashData("scenesbygroup", parm);
        const result = resultdata.findScenes;

        stashDBScenes.push(...result.scenes);
        if (stashDBScenes.length >= result.count || result.scenes.length < 25)
          break;
        page++;
      }
      */
      let galleryscenes = CreatedisplayObject(groupsceneData);

      if (galleryscenes) {
        //createMissingScenesModal(missingscenes, datajson.groupId);


        createSearchDisplayModal(screenTitle,galleryscenes);

        //search-display-modal
        //performers-custom-missingScenesModal
        document.getElementById("search-display-itemsModal").style.display =
          "block";
      } else {
        console.error("Failed to fetch performer details or StashDB scenes");
      }
      hideLoadingSpinner();
    }

    return true;
  }

  function UpdateElement(targetAction) {
    var targetElementId = targetAction.targetElementId;
    var targetElement = document.getElementById(targetElementId);
    console.log("UpdateElement", UpdateElement);
    if (targetElement) {
      targetElement.setAttribute("style", "display: none;");
    }
  }

  function validateResponse(buttonAction, actionResult) {
    console.log("validate Response buttonAction", buttonAction);
    console.log("validate Response", actionResult);
    let browseraction = {};

    if (buttonAction == "view") {
      browseraction.isSuccess = true;
      browseraction.pagereload = false;
      browseraction.data = "Link Opened";
    } else if (buttonAction == "viewgroupscenes") {
      browseraction.isSuccess = true;
      browseraction.pagereload = false;
      browseraction.data = "Link Opened";
    } else {
      if (
        hasvalidValue(actionResult) &&
        actionResult.hasOwnProperty(buttonAction)
      ) {
        console.log("actionResult has value ", buttonAction);

        var stashres = actionResult[buttonAction];
console.log("stashres",stashres);
        console.log("stashres Type",typeof(stashres));


        if (stashres.hasOwnProperty("id")) {
          var recordId = stashres.id;
          browseraction.data = buttonAction + " id:" + recordId;
          browseraction.isSuccess = true;
          browseraction.pagereload = true;
          console.log("success", browseraction.data);
        } else if (stashres.hasOwnProperty("rows_affected")) {
          var recordId = stashres.rows_affected;
          browseraction.data = buttonAction + " records affected:" + recordId;
          browseraction.isSuccess = true;
          browseraction.pagereload = false;
          console.log("success", browseraction.data);
        }
        else if (stashres instanceof Array && stashres.length > 0)
          {
          var recordcount = stashres.length;
          browseraction.data = buttonAction +  recordcount +" records affected:";
          browseraction.isSuccess = true;
          browseraction.pagereload = true;
          console.log("success", browseraction.data);
          }

        else {
          console.log("No Record Id received for ", buttonAction);
          browseraction.isSuccess = false;
          browseraction.pagereload = false;
          browseraction.data = actionResult;
        }
      } else {
        console.log("actionResult has no value ", buttonAction);
        browseraction.isSuccess = false;
        browseraction.pagereload = false;
        browseraction.data = actionResult;
      }
    }

    return browseraction;
  }

  //STASH
  async function addPerformerToScene(scenarioData) {
    const tmdb_id = scenarioData.tmdb_id;
    let addPerformerResponse = {};
    const performerRsponse = await getStashData("performerbytmdbid", tmdb_id);
    if (performerRsponse) {
      const performerdata = performerRsponse.findPerformers;

      console.log("performerRsponse", performerRsponse);
      console.log("performerdata", performerdata);
      var sceneupdatedata = {};
      var performerids = scenarioData.performerids;
      var sceneId = scenarioData.scene_id;
      console.log("performer count", performerdata.count);

      if (performerdata.count == 1) {
        let performerId = performerdata.performers[0].id;
        performerids.push(performerId);
        sceneupdatedata["id"] = sceneId;
        var filteredPeformers = performerids.filter((e) => e !== "0");
        sceneupdatedata["performer_ids"] = filteredPeformers;
        addPerformerResponse = await updateStash(
          "sceneUpdate",
          sceneupdatedata
        );
        console.log("addPerformerResponse", addPerformerResponse);
      } else if (performerdata.count == 0) {
        console.log(
          "No performer found for the tmdb_id :",
          scenarioData.tmdb_id
        );
      } else {
        console.log(
          "Multiple performer found for the tmdb_id :",
          scenarioData.tmdb_id
        );
      }
    }

    return addPerformerResponse;
  }
  async function getStashData(queryType, parameter) {
    console.log("getStashData:", queryType + ":" + parameter);
    var query = "";
    var filter = {};

    switch (queryType) {
      case "performerbyname":
        query = `query FindPerformers($filter:PerformerFilterType){findPerformers(performer_filter:$filter){count performers{id name gender birthdate urls image_path country custom_fields groups{id name urls}}}}`;
        filter = { name: { value: parameter, modifier: "EQUALS" } };
        break;
      case "performerbytmdbid":
        query = `query FindPerformers($filter:PerformerFilterType){findPerformers(performer_filter:$filter){count performers{id name custom_fields}}}`;
        filter = {
          custom_fields: {
            field: "tmdb_id",
            modifier: "EQUALS",
            value: parameter,
          },
        };
        break;
      case "groupsbyurl":
        query = `query FindGroups($filter:GroupFilterType){findGroups(group_filter:$filter){count groups{id name aliases urls synopsis front_image_path date containing_groups{group{id name}} sub_groups{group{id name}} scene_count scenes{id title date paths{screenshot} groups{scene_index} performers{id name urls custom_fields}}}}}`;
        filter = { url: { value: parameter, modifier: "INCLUDES" } };
        break;
      case "scenesbygroup":
        query = `query FindScenes($filter:FindFilterType){findScenes(filter:$filter){count scenes{id title date paths{screenshot}performers{id name urls custom_fields}groups{scene_index group{id}}}}}`;
        filter = { q: parameter ,
                   sort:"title" };
        break;
    }

    return await csLib
      .callGQL({ query, variables: { filter } })
      .then((data) => data);
  }
  async function updateStash(mutationType, mutationData) {
    var mutationQuery = "";
    switch (mutationType) {
      case "performerCreate":
        mutationQuery = `mutation PerformerCreate($input:PerformerCreateInput!){performerCreate(input:$input){id}}`;
        break;
      case "performerUpdate":
        mutationQuery = `mutation PerformerUpdate($input:PerformerUpdateInput!){performerUpdate(input:$input){id}}`;
        break;
      case "groupCreate":
        mutationQuery = `mutation GroupCreate($input:GroupCreateInput!){groupCreate(input:$input){id}}`;
        break;
      case "groupUpdate":
        mutationQuery = `mutation GroupUpdate($input:GroupUpdateInput!){groupUpdate(input:$input){id}}`;
        break;
      case "sceneUpdate":
        mutationQuery = `mutation SceneUpdate($input:SceneUpdateInput!){sceneUpdate(input:$input){id performers{id}}}`;
        break;
      case "bulkSceneUpdate":
        mutationQuery = `mutation BulkSceneUpdate($input:BulkSceneUpdateInput!){bulkSceneUpdate(input:$input){id}}`;
        break;
      case "execSQL":
        mutationQuery = `mutation ExecSQL($sql:String!,$args:[Any]){execSQL(sql:$sql,args:$args){rows_affected}}`;
        break;

    }
    const input = mutationData;
    const query = mutationQuery;
    console.log("query", query);
    console.log("input", input);
    if (mutationType == "execSQL") {
      return await csLib
        .callGQL({ query, variables: mutationData })
        .then((data) => data);
    } else {
      return await csLib
        .callGQL({ query, variables: { input } })
        .then((data) => data);
    }
  }
  //TMDB
  function getTmdbPageCategory() {
    console.log("getTmdbPageCategory");
    var tmdbPageType = {};
    var scenarioSettings = {};

    var pathArray = window.location.pathname.split("/");
    tmdbPageType.scenario_url = window.location.href;
    tmdbPageType.Pathlength = pathArray.length - 1;

    console.log(pathArray);

    var scenarioUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      "/" +
      pathArray[1] +
      "/" +
      pathArray[2];

    for (let i = 1; i <= pathArray.length - 1; i++) {
      console.log("path:", pathArray[i]);
      tmdbPageType[TMDBPageSettings[i]] = pathArray[i];
    }
    console.log("PageType", tmdbPageType);
    var pageScenarioID = 0;

    if (
      hasvalidValue(tmdbPageType["category"]) &&
      tmdbPageType["category"] == "person"
    ) {
      pageScenarioID = 1;
    } else if (
      hasvalidValue(tmdbPageType["category"]) &&
      tmdbPageType["category"] == "movie"
    ) {
      pageScenarioID = 2;
    } else if (
      hasvalidValue(tmdbPageType["category"]) &&
      tmdbPageType["category"] == "tv"
    ) {
      if (
        hasvalidValue(tmdbPageType["episode"]) &&
        tmdbPageType["episode"] == "episode"
      ) {
        pageScenarioID = 6;
      } else if (
        hasvalidValue(tmdbPageType["season"]) &&
        tmdbPageType["season"] == "season"
      ) {
        pageScenarioID = 5;
      } else if (
        hasvalidValue(tmdbPageType["season"]) &&
        tmdbPageType["season"] == "seasons"
      ) {
        pageScenarioID = 4;
      } else {
        pageScenarioID = 3;
      }
    }
    scenarioSettings.scenarioID = pageScenarioID;
    scenarioSettings.scenarioName = pageScenario[pageScenarioID];
    scenarioSettings.currentURL = window.location.href;
    scenarioSettings.scenarioUrl = scenarioUrl;

    console.log("page scenario Type:", pageScenarioID);
    console.log("page scenario Name:", pageScenario[pageScenarioID]);
    return scenarioSettings;
  }
  async function getTmdbData(scenarioID) {
    console.log("getTmdbData:", scenarioID);
    var tmdbpage = {};
    var tmdbObj = {};
    let image = "";
    let otherinfo = {};

    switch (scenarioID) {
      case 1:
        tmdbObj.name = getTitle(scenarioID);
        image = getImage();
        if (image != "") {
          tmdbObj.image = image;
        }
        tmdbObj.custom_fields = getCustomFields();
        tmdbObj.urls = getUrls(scenarioID);
        otherinfo = getPersonDetails();
        var keys1 = Object.keys(otherinfo);
        keys1.forEach((key) => {
          tmdbObj[key] = otherinfo[key];
        });
        tmdbpage.stashobj = tmdbObj;
        tmdbpage.actingCredits = getActingCredits();
        break;

      case 2:
      case 3:
        tmdbObj.name = getTitle(scenarioID);
        image = getImage();
        if (image != "") {
          tmdbObj.front_image = image;
        }
        otherinfo = getGroupDetails();
        var keys2 = Object.keys(otherinfo);
        keys2.forEach((key) => {
          tmdbObj[key] = otherinfo[key];
        });
        tmdbObj.urls = getUrls(scenarioID);
        tmdbpage.stashobj = tmdbObj;

        break;
      case 4:
        const seasons = getSeasons(scenarioID);
        tmdbpage.seasonsCount = seasons.length;
        tmdbpage.stashobjs = seasons;
        break;
      case 5:
        const episodes = getEpisodes(scenarioID);
        tmdbpage.episodesCount = episodes.length;
        tmdbpage.stashobjs = episodes;
        break;
      case 6:
        const episodes1 = getEpisodes(scenarioID);
        tmdbpage.episodesCount = episodes1.length;
        tmdbpage.stashobjs = episodes1;
        break;
    }
    return tmdbpage;
  }

  function getTitle(scenarioID) {
    console.log("getTitle");
    var title = "";
    const profileTitleContainer = document.querySelector(".title");
    if (profileTitleContainer) {
      var profileTitleElement = profileTitleContainer.querySelectorAll("h2");
      if (profileTitleElement) {
        if (scenarioID == 1) {
          title = profileTitleElement[0].innerText;
        } else {
          let h2element = profileTitleElement[0];
          let firstainh2 = h2element.querySelectorAll("a")[0];
          let tmptitle = firstainh2.innerText;

          //title = tmptitle.split("(")[0].trim();
          title = tmptitle;
        }
      }
    }
    return title;
  }
  function getImage() {
    console.log("getImage");
    var image = "";
    const Image_Container = document.getElementById("original_header");

    if (Image_Container) {
      const Images = Image_Container.querySelectorAll("img");
      console.log("Images", Images);
      if (Images.length > 0) {
        image = Images[0].src;
      }
    }

    return image;
  }

  function getCustomFields() {
    console.log("getCustomFields");
    var custom_fields = {};
    var pageUrl = window.location.href;
    custom_fields.tmdb_id = pageUrl.split("/").pop();
    custom_fields.visit_count = 0;

    return custom_fields;
  }
  function getUrls(scenarioID) {
    console.log("getUrls");
    var URLS = [];
    URLS.push(window.location.href);
    if (scenarioID == 1) {
      const performerSocialLinks =
        document.getElementsByClassName("social_links");
      if (performerSocialLinks) {
        const Links = performerSocialLinks[0].querySelectorAll("a");
        for (let i = 0; i < Links.length; i++) {
          if (Links[i].src) {
            URLS.push(Links[i].href);
          }
        }
      }
    }
    return URLS;
  }
  function getPersonDetails() {
    var splitstr;
    //console.log("getPersonDetails");
    var tmdbStashPerformerObj = {};
    const performerFacts = document.getElementsByClassName("facts");
    //console.log("performerFacts",performerFacts);
    if (performerFacts[1]) {
      const performerDetails = performerFacts[1].querySelectorAll("p");
      //console.log("performerDetails",performerDetails);
      var k1 = "";
      var v1 = "";
      for (let i = 0; i < performerDetails.length; i++) {
        //console.log(i);
        //console.log("performerDetails",performerDetails[i].innerText);

        splitstr = performerDetails[i].innerText.split(/\r?\n/);
        //console.log("performerDetails split",splitstr);

        k1 = splitstr[0];
        v1 = splitstr[1];
        console.log("k1", k1);
        console.log("v1", v1);

        if (k1 && v1 && v1 != "-") {
          if (k1 == "Gender") {
            tmdbStashPerformerObj.gender = v1.toUpperCase();
          } else if (k1 == "Birthday") {
            tmdbStashPerformerObj.birthdate = formatDate(v1);
          } else if (k1 == "Place of Birth") {
            var contrycode = GetCountryCode(v1);
            if (contrycode.length > 0) {
              tmdbStashPerformerObj.country = contrycode;
            }
          }
        }

        k1 = "";
        v1 = "";
      }
    }
    return tmdbStashPerformerObj;
  }
  function getActingCredits() {
    var actingList = [];
    const performerCredits = document.getElementsByClassName("credits_list")[0];
    const performerActing = performerCredits.querySelectorAll("a");

    for (let i = 0; i < performerActing.length; i++) {
      let acting = {};
      let anchor = performerActing[i];
      acting.title = anchor.innerText;
      acting.link = anchor.href;
      actingList.push(acting);
    }
    return actingList;
  }
  function getGroupDetails() {
    var tmdbStashGroupObj = {};

    const GroupHeader = document.getElementById("original_header");
    const headerInfo = document.getElementsByClassName("header_info");
    if (headerInfo[0]) {
      const Groupsynopsys = headerInfo[0].querySelectorAll("p")[0].innerText;
      if (Groupsynopsys) {
        tmdbStashGroupObj.synopsis = Groupsynopsys;
      }
    }

    const release = GroupHeader.querySelectorAll(".release");

    if (release && release.length > 0) {
      const releaseDate = release[0].innerText.split(" ")[0];
      tmdbStashGroupObj.date = formatDate(releaseDate);
    }

    const AdditionalInfo = document.getElementsByClassName("split_column");
    const AdditionalInfoDetails = AdditionalInfo[0].querySelectorAll("p");
    const AliasLookup = "Original Title";
    var pElementValue = "";
    //tmdbStashGroupObj.aliases="";
    for (let i = 0; i <= AdditionalInfoDetails.length - 1; i++) {
      pElementValue = AdditionalInfoDetails[i].innerText;

      let result = pElementValue.includes("Original Title");
      if (result) {
        let org_title = pElementValue.split(/\r?\n/);
        tmdbStashGroupObj.aliases = org_title[1];
        //console.log('Original Title',org_title[1]);
      }
    }

    return tmdbStashGroupObj;
  }
  function getSeasons(scenarioID) {
    var tvseasons = [];
    const seasons_info = document.getElementsByClassName("season");
    const tvname = getTitle(scenarioID);
    if (seasons_info && seasons_info.length > 0) {
      // console.log("season found", seasons_info);

      for (let i = 0; i < seasons_info.length; i++) {
        var tmdbSeasonObj = {};
        // console.log(seasons_info[i]);
        var SeasonImageUrl = seasons_info[i].querySelectorAll("img")[0].src;
        tmdbSeasonObj.front_image = SeasonImageUrl;
        var SeasonTitle = seasons_info[i].querySelectorAll("h2")[0].innerText;

        var SeasonURL = seasons_info[i].querySelectorAll("a")[0].href;
        var SeasonNum = SeasonURL.split("/").pop();
        var SeasonPrefix = "S" + String(SeasonNum).padStart(2, "0");
        tmdbSeasonObj.name = tvname + ":" + SeasonPrefix;
        //seasonData.SeasonNum=SeasonNum;
        var urls = [];
        urls.push(SeasonURL);

        tmdbSeasonObj.urls = urls;
        var season_overview =
          seasons_info[i].querySelectorAll("p")[0].innerText;
        // console.log("SeasonImageUrl", SeasonImageUrl);
        // console.log("SeasonTitle", SeasonTitle);
        // console.log("SeasonURL", SeasonURL);
        // console.log("season_overview", season_overview);
        tmdbSeasonObj.synopsis = season_overview;

        const release = season_overview.split("on ");
        if (release.length > 1) {
          const releaseDate = release[2].replace(".", "");
          tmdbSeasonObj.date = formatDate(releaseDate);
        }
        console.log("release", release);

        // console.log("seasonData", seasonData);
        tvseasons.push(tmdbSeasonObj);
        // console.log("tvseasons", tvseasons);
      }
    }
    return tvseasons;
  }
  function getEpisodes(scenarioID) {
    var tvepisodes = [];
    const tvseasonname = getTitle(scenarioID);
    const episodes_info = document.getElementsByClassName("episode_list");
    if (episodes_info && episodes_info.length > 0) {
      const episodes = episodes_info[0].querySelectorAll(".card");
      // console.log("episodes", episodes);

      if (episodes && episodes.length > 0) {
        // console.log("episodes", episodes);

        for (let i = 0; i <= episodes.length - 1; i++) {
          var episodeData = {};

          const episode = episodes[i];
          // console.log("episode", episode);

          var EpisodeImageUrl = episode.querySelectorAll("img")[0].src;

          episodeData.front_image = EpisodeImageUrl;

          var EpisodeURL = episode.querySelectorAll("a")[0];

          //console.log("EpisodeURL", EpisodeURL.href);
          //console.log("EpisodeURL", EpisodeURL.title);

          var EpisodeNum = episode.querySelectorAll(".episode_number")[0];
          // console.log("EpisodeNum", EpisodeNum.innerText);

          var EpisodePrefix = "E" + EpisodeNum.innerText.padStart(2, "0");

          //seasonData.SeasonNum=SeasonNum;
          var eurls = [];
          eurls.push(EpisodeURL.href);

          episodeData.urls = eurls;

          var EpisodeTitleSecion =
            episode.querySelectorAll(".episode_title")[0];

          var EpisodeTitle = EpisodeTitleSecion.querySelectorAll("a")[0];

          // console.log("EpisodeTitle", EpisodeTitle.innerText);

          episodeData.name = EpisodePrefix + ":" + EpisodeTitle.innerText;

          var episode_overview = episode.querySelectorAll(".overview")[0];

          episodeData.synopsis = episode_overview.innerText;

          var EpisodeDate = EpisodeTitleSecion.querySelectorAll(".date")[0];
          var EpisodeDateSpan = EpisodeDate.querySelectorAll("span")[0];
          // console.log("EpisodeDateSpan", EpisodeDateSpan);
          var episodeReleasedate = EpisodeDateSpan.innerText;
          // console.log("before format episodeReleasedate", episodeReleasedate);

          episodeReleasedate = episodeReleasedate.trim();
          // console.log("before trim episodeReleasedate", episodeReleasedate);
          episodeReleasedate = formatDate(episodeReleasedate);
          // console.log("episodeReleasedate", episodeReleasedate);

          if (episodeReleasedate) {
            episodeData.date = episodeReleasedate;
          }
          /*  var Episode_overview=episode.querySelectorAll('p')[0].innerText;*/
          // console.log("EpisodeImageUrl", EpisodeImageUrl);
          // console.log("EpisodeURL", EpisodeURL);

          // console.log("episodeData", episodeData);
          tvepisodes.push(episodeData);
        }
      }
    }

    return tvepisodes;
  }

  //UI
  let slideshowInterval;
  function startSlideshow(images) {
    const spinner = document.getElementById("search-display-loading-spinner");
    let currentIndex = 0;

    function showNextImage() {
      if (currentIndex >= images.length) {
        currentIndex = 0;
      }
      const imgHTML = `<img src="${images[currentIndex].url}" alt="Image">`;
      spinner.insertAdjacentHTML("afterbegin", imgHTML);
      const imgElement = spinner.querySelector("img");
      imgElement.addEventListener("animationend", () => {
        const allImages = spinner.querySelectorAll("img");
        if (allImages.length > 1) {
          allImages[1].remove();
        }
      });
      currentIndex++;
    }

    showNextImage();
    setInterval(showNextImage, 2000);
  }

  function showLoadingSpinner(images) {
    const spinner = document.getElementById("search-display-loading-spinner");
    const dimOverlay = document.getElementById("search-display-dim-overlay");
    if (spinner) {
      spinner.innerHTML =
        '<div class="search-display-loading-header">Fetching Scenes...</div>';
      startSlideshow(images);
      spinner.style.display = "block";
      dimOverlay.style.display = "block";
    }
  }

  function hideLoadingSpinner() {
    const spinner = document.getElementById("search-display-loading-spinner");
    const dimOverlay = document.getElementById("search-display-dim-overlay");
    if (spinner) {
      clearInterval(slideshowInterval);
      spinner.style.display = "none";
      dimOverlay.style.display = "none";
    }
  }

  // Function to create the missing scenes modal
  function createMissingScenesModal(missingScenes) {
    console.log("createMissingScenesModal", missingScenes);
    const totalScenes = missingScenes.length;
    let currentPage = 1;
    const scenesPerPage = 27;
    const totalPages = Math.ceil(totalScenes / scenesPerPage);

    function renderScenes(page) {
      const start = (page - 1) * scenesPerPage;
      const end = start + scenesPerPage;
      const scenesHTML = missingScenes
        .slice(start, end)
        .sort((a, b) => new Date(b.scene_date) - new Date(a.scene_date))
        .map(
          (scene) => `
                <div id="item_container_${
                  scene.scene_id
                }"class="performers-custom-scene-option" data-id="${
            scene.scene_id
          }">
                    <h3>${scene.scene_title}</h3>
                    <img src="${scene.scene_img || ""}" alt="${scene.title}">
                    <p>Release Date: ${scene.scene_date}</p>
                    <p><button id="${scene.scene_id}" data-mydata='${
            scene.scene_data
          }' title="Add" class="btn btn-secondary btn-sm minimal ml-1 scene-custom-add-button">Add</button></p>




                    <a href="https://stashdb.org/scenes/${
                      scene.id
                    }" target="_blank">Find on StashDB</a>
                </div>
            `
        )
        .join("");
      document.getElementById("performers-custom-sceneGallery").innerHTML =
        scenesHTML;

      document.getElementById(
        "performers-custom-pagination-controls-scenes"
      ).innerHTML = `
                ${
                  page > 1
                    ? `<span class="performers-custom-page-link" data-page="${
                        page - 1
                      }">Previous</span>`
                    : ""
                }
                ${
                  page < totalPages
                    ? `<span class="performers-custom-page-link" data-page="${
                        page + 1
                      }">Next</span>`
                    : ""
                }
            `;

      document
        .querySelectorAll(".performers-custom-page-link")
        .forEach((link) => {
          link.onclick = function () {
            renderScenes(parseInt(link.getAttribute("data-page")));
          };
        });

      document
        .querySelectorAll(".scene-custom-add-button")
        .forEach((actionBtn) => {
          actionBtn.addEventListener("click", (evt) => {
            console.log("scene-custom-add-button", evt.target.dataset.mydata);
            var mydatajson = JSON.parse(evt.target.dataset.mydata);
            const res = ButtonAction(mydatajson);
          });
        });
    }

    const modalHTML = `
            <div id="performers-custom-missingScenesModal" class="performers-custom-modal">
                <div class="performers-custom-modal-content">
                    <span class="performers-custom-close">&times;</span>
                    <center><h2>Missing Scenes from StashDB</h2></center>
                    <div id="performers-custom-sceneGallery"></div>
                    <div id="performers-custom-pagination-controls-scenes"></div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    renderScenes(currentPage);

    const modal = document.getElementById(
      "performers-custom-missingScenesModal"
    );
    const span = document.getElementsByClassName("performers-custom-close")[0];
    span.onclick = function () {
      modal.style.display = "none";
      modal.remove();
    };
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        modal.remove();
      }
    };
  }

  function createSearchDisplayModal(screenTitle,resultDataObject) {
    console.log("Search Display content", resultDataObject);
    const totaltems = resultDataObject.length;
    let currentPage = 1;
    const itemsPerPage = 27;
    const totalPages = Math.ceil(totaltems / itemsPerPage);

    function renderContent(page) {
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const itemsHTML = resultDataObject
        .slice(start, end)
        //.sort((a, b) => new Date(b.item_date) - new Date(a.item_date))
      .sort((a, b) => b.title - a.title)
        .map(
          (itemObj) => `
                <div id="item_container_${
                  itemObj.item_id
                }"class="search-display-item-option" data-id="${
            itemObj.item_id
          }">
                    <h3>${itemObj.item_title}</h3>
                    <img src="${itemObj.item_img || ""}" alt="${itemObj.title}">
                    <p>Date: ${itemObj.item_date}  | actress : ${itemObj.actress_count}</p>
                    <p>Scene # : ${itemObj.item_index} </p>
                    <p>
                  <button id="${itemObj.item_id}" data-mydata='${itemObj.item_data}' title="${itemObj.item_action}" class="btn btn-secondary btn-sm minimal ml-1 item-add-button" style="display: ${itemObj.item_display}">${itemObj.item_action}</button></p>

                </div>
            `
        )
        .join("");
      document.getElementById("search-display-itemGallery").innerHTML =
        itemsHTML;

      document.getElementById(
        "search-display-pagination-controls-items"
      ).innerHTML = `
                ${
                  page > 1
                    ? `<span class="search-display-page-link" data-page="${
                        page - 1
                      }">Previous</span>`
                    : ""
                }
                ${
                  page < totalPages
                    ? `<span class="search-display-page-link" data-page="${
                        page + 1
                      }">Next</span>`
                    : ""
                }
            `;

      document.querySelectorAll(".search-display-page-link").forEach((link) => {
        link.onclick = function () {
          renderContent(parseInt(link.getAttribute("data-page")));
        };
      });

      document.querySelectorAll(".item-add-button").forEach((actionBtn) => {
        actionBtn.addEventListener("click", (evt) => {
          console.log("item-add-button", evt.target.dataset.mydata);
          var mydatajson = JSON.parse(evt.target.dataset.mydata);
          const res = ButtonAction(mydatajson);
        });
      });
    }
//<center><h2>${screenTitle}</h2></center>
    const modalHTML = `
            <div id="search-display-itemsModal" class="search-display-modal">
                <div class="search-display-modal-content">
                  <div class="popup-header">

                    <span class="popup-header-title">${screenTitle}</span>
                    <span class="search-display-close">&times;</span>
                  </div>

                    <div id="bulk-operation_element"></div>
                    <div id="search-display-itemGallery"></div>
                    <div id="search-display-itemGallery"></div>
                    <div id="search-display-pagination-controls-items"></div>
                </div>
            </div>
        `;
    console.log("insertAdjacentHTML");
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    renderContent(currentPage);
console.log("Append bulkActionElement resultDataObject",resultDataObject );
    const bulkelementbutton = document.getElementById("bulk-operation_element");
    bulkelementbutton.appendChild(resultDataObject.bulkActionElement);

    const modal = document.getElementById("search-display-itemsModal");


    const span = document.getElementsByClassName("search-display-close")[0];
    span.onclick = function () {
      modal.style.display = "none";
      modal.remove();
    };
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        modal.remove();
      }
    };
  }

  function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName("head")[0];
    if (!head) {
      return;
    }
    style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = css;
    head.appendChild(style);
  }

  function createStashActionButtonGroup(
    scenarioID,
    stashGroupObj,
    stashbaseURL,
    buttonId,
    buttonTitle,
    buttonData
  ) {
    console.log("createStashActionButtonGroup stashGroupObj", stashGroupObj);

    const StashActionButtonGroup = document.createElement("div");

    var StashActionButtonGroupId =
      "StashActionButtonGroup_" + scenarioID + "_1";
    const pageactionbtn = createStashActionButton(
      StashActionButtonGroupId,
      buttonTitle,
      buttonData
    );
    StashActionButtonGroup.appendChild(pageactionbtn);

    StashActionButtonGroupId = "StashActionButtonGroup_" + scenarioID + "_2";
    const groupdata = stashGroupObj;
    console.log("groupdata", groupdata);
    const sceneCount = groupdata
      .map((item) => item.scene_count)
      .reduce((prev, curr) => prev + curr, 0);

    if (groupdata.length > 0) {
      const groupInfo = groupdata[0];

      console.log("groupInfo", groupInfo);
      var infodata = {};
      var infofinddata = {};

      // scene count button
      buttonId = StashActionButtonGroupId + "_info";
      buttonTitle = "# of Scenes : " + sceneCount;

      if (scenarioID == 2 || scenarioID == 5) {
        var btngroupData = {};
        btngroupData.gid = groupInfo.id;
        btngroupData.gname = groupInfo.name;
        btngroupData.gdate = groupInfo.date;
        btngroupData.gscene_count = sceneCount;
        btngroupData.scenes = groupInfo.scenes;

        infodata.actionType = "viewgroupscenes";
        infodata.actionData = btngroupData;

        var my_sdata_str = JSON.stringify(infodata, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });
      } else {
        var bd = {};
        bd.url = stashbaseURL + groupInfo.id;
        infodata.actionType = "view";
        infodata.actionData = bd;

        var my_sdata_str = JSON.stringify(infodata, (key, value) => {
          if (!isNaN(value)) value = Number(value);
          return value;
        });
      }

      var scenariInfoButton = createStashActionButton(
        buttonId,
        buttonTitle,
        my_sdata_str
      );

      StashActionButtonGroup.appendChild(scenariInfoButton);

      // find scene button
      buttonId = StashActionButtonGroupId + "_find";
      buttonTitle = "Check for Scenes";
      let seachstr = "";

      if (scenarioID == 5) {
        let episodegroup = groupInfo.name;
        seachstr = episodegroup.split(":")[0];
      } else {
        seachstr = groupInfo.name;
        if (groupInfo.aliases != "" && groupInfo.aliases != "0") {
          console.log("has alias ", groupInfo.aliases);
          seachstr = seachstr + " or " + groupInfo.aliases;
        }
      }
      const validsearchStr = seachstr.replace(/[^a-zA-Z0-9\s]/g, "");

      infofinddata.actionType = "scenesbygroup";
      infofinddata.actionData = validsearchStr;
      infofinddata.groupId = groupInfo.id;

      var my_fdata_str = JSON.stringify(infofinddata, (key, value) => {
        if (!isNaN(value)) value = Number(value);
        return value;
      });

      var scenarioFindButton = createStashPopupActionButton(
        buttonId,
        buttonTitle,
        my_fdata_str
      );
      StashActionButtonGroup.appendChild(scenarioFindButton);

      /*
      if (groupInfo.scene_count == 0) {
        buttonId = StashActionButtonGroupId + "_find";
        buttonTitle = "Check for Scenes";
        let seachstr = groupInfo.name;

        infodata.actionType = "scenesbygroup";
        infodata.actionData = seachstr;
        infodata.groupId=groupInfo.id;
      }


      else {
        buttonId = StashActionButtonGroupId + "_info";
        buttonTitle = "# of Scenes : " + groupInfo.scene_count;
        var bd = {};
        bd.url = stashbaseURL + groupInfo.id;
        infodata.actionType = "view";
        infodata.actionData = bd;
      }

      var my_sdata_str = JSON.stringify(infodata, (key, value) => {
        if (!isNaN(value)) value = Number(value);
        return value;
      });

      let scenariInfoButton="";
      if(infodata.actionType=="scenesbygroup")
        {
       scenariInfoButton = createStashPopupActionButton(
        buttonId,
        buttonTitle,
        my_sdata_str
      );
        }
      else
      {
       scenariInfoButton = createStashActionButton(
        buttonId,
        buttonTitle,
        my_sdata_str
      );
      }

      StashActionButtonGroup.appendChild(scenariInfoButton);*/
    }

    console.log(StashActionButtonGroup);
    return StashActionButtonGroup;
  }

  function createStashPopupActionButton(buttonId, buttonTitle, buttonData) {
    const actionBtn = document.createElement("button");
    actionBtn.setAttribute("id", buttonId);
    actionBtn.setAttribute("data-mydata", buttonData);
    actionBtn.title = buttonTitle;
    actionBtn.innerText = buttonTitle;
    actionBtn.classList.add(
      "btn",
      "btn-secondary",
      "btn-sm",
      "minimal",
      "ml-1"
    );
    actionBtn.addEventListener("click", (evt) => {
      var mydatajson = JSON.parse(evt.target.dataset.mydata);
      const res = ButtonPopupAction(mydatajson);
    });

    return actionBtn;
  }

  function createStashActionButton(buttonId, buttonTitle, buttonData,showButton=true) {
    const actionBtn = document.createElement("button");
    actionBtn.setAttribute("id", buttonId);
    actionBtn.setAttribute("data-mydata", buttonData);
    actionBtn.title = buttonTitle;
    actionBtn.innerText = buttonTitle;
    actionBtn.classList.add(
      "btn",
      "btn-secondary",
      "btn-sm",
      "minimal",
      "ml-1"
    );
    if(!showButton)
      {
        actionBtn.setAttribute("style", "display:none");
      }
    actionBtn.addEventListener("click", (evt) => {
      var mydatajson = JSON.parse(evt.target.dataset.mydata);
      const res = ButtonAction(mydatajson);
    });

    return actionBtn;
  }

  //Utilities
  function pageReload(reloadpage) {
    if (reloadpage) {
      window.location.reload();
    }
  }
  function difference(origObj, newObj) {
    function changes(newObj, origObj) {
      let arrayIndexCounter = 0;
      return transform(newObj, function (result, value, key) {
        if (!isEqual(value, origObj[key])) {
          let resultKey = isArray(origObj) ? arrayIndexCounter++ : key;
          result[resultKey] =
            isObject(value) && isObject(origObj[key])
              ? changes(value, origObj[key])
              : value;
        }
      });
    }
    return changes(newObj, origObj);
  }
  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }
  function formatDate(dtstr) {
    var newdt = "";
    dtstr = dtstr.trim();
    if (dtstr.split("(")[0]) {
      newdt = dtstr.split("(")[0];
    } else {
      newdt = dtstr;
    }

    var d = new Date(dtstr),
      month = "" + (d.getMonth() + 1),
      day = "" + d.getDate(),
      year = d.getFullYear();
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
  }
  function hasvalidValue(inputobj) {
    var isValid = true;
    if (inputobj === null || inputobj === undefined || inputobj === "") {
      isValid = false;
    }
    return isValid;
  }
  function GetCountryCode(selectedCountry) {
    var ccode = "";
    var country = "";
    if (selectedCountry.split(/[\s,]+/).pop()) {
      country = selectedCountry.split(/[\s,]+/).pop();
    } else {
      country = selectedCountry;
    }
    // console.log("parse country", selectedCountry);

    if (countryCodes[country]) {
      ccode = countryCodes[country];
    } else {
      // console.log("Stash-TMDB:No country code for %s", country);
    }

    return ccode;
  }

  function OpenButtonLink(linkdata) {
    // console.log("Linkdata", linkdata);
    window.open(
      linkdata,
      "_blank" // <- This is what makes it open in a new window.
    );
  }
})();

/*
  const scenarioTypeMap = {
    1: "person",
    2: "movie",
    3: "tv",
    4: "seasons",
    5: "season",
    6: "episode",
    7: "sceneperformer",
    8: "groupscenes",
  };
  const scenarioStatusMap = {
    1: "Add",
    2: "Update",
    3: "View",
    4: "Remove",
    5: "scenesbygroup",
    6: "addPerformertoscene",
  };

  const StashURL_Prefix = {
    1: "performers/",
    2: "groups/",
    3: "groups/",
  };
    const pageScenarioPath = {
    1: "category",
    2: "category_value",
    3: "season",
    4: "season_value",
    5: "episode",
    6: "episode_value",
  };
  const stashAction = {
    1: "Add",
    2: "Update",
    3: "View",
    4: "Remove",
    5: "findscenesforgroup",
    6: "addperformertoscene",
  };


  */
