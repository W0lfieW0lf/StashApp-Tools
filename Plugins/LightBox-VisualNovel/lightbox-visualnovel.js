(async function () {
  "use strict";

  // Default Settings
  const defaultPluginSettings = {
    debug: false,
      };
  
  // getConfiguration is from cs-ui-lib.js
  const lbvnSettings = await csLib.getConfiguration("lightbox-visualnovel", {}); 

  const pluginSettings = {
    ...defaultPluginSettings,
    ...lbvnSettings,
   
  };
 
  // Console logger
  function Logger(msgtitle, msgvalue,debug) {
    var logMessage=msgtitle+ ":"+ msgvalue;
     if (pluginSettings.debug) {
      console.log(logMessage);
    }
   }


// Main Function Setup logger
  function SetupLightBox() {

    waitForElement(".Lightbox-carousel", (element) => {
      Logger('SetupLightBox', 'Lightbox-carousel Found');
      
      const Footer = document.querySelectorAll(".Lightbox-footer");
      
      Logger('SetupLightBox:Footer', Footer);
      
      Footer[0].style.opacity = 1;
      const ImgInfo = Footer[0].querySelectorAll("a")[0];
      const imgurl = ImgInfo.href;
      const ImgId = imgurl.substring(imgurl.lastIndexOf("/") + 1);
      
      
      const targetNode = ImgInfo;
      GetImageDetails(ImgId, targetNode);

      const callback = function (mutationsList, observer) {
        for (const mutation of mutationsList) {
          const Target = mutation.target;
          const TargetUrl = Target.href;
          const RefImgId = TargetUrl.substring(imgurl.lastIndexOf("/") + 1);
          const RefImgTitle = mutation.target.innerText;
          Logger('callback:ImgId', RefImgId);
          Logger('callback:ImgInfo', RefImgTitle);
          GetImageDetails(RefImgId, Target);
        }
      };

      // Observe hyperlink on Lightbox footer.

      const observer = new MutationObserver(callback);
      observer.observe(targetNode, {
        attributes: true,
      });
    });
  }


  // Create an observer instance linked to the callback function

  // Modified waitForElement function
  function waitForElement(selector, callback) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
            callback(node);
          }
          // If the node has children, recursively check each child node that matches the selector
          node.querySelectorAll &&
            node.querySelectorAll(selector).forEach(callback);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Function to stop observing
    function stopObserving() {
      observer.disconnect();
    }

    return stopObserving;
  }
  
// Get image details for the image and type write the content. if there is no description use the default image title.

  async function GetImageDetails(ImageId, Target) {
    const imgDetails = await getImageDetails(ImageId);
    Logger('GetImageDetails:imgDetails', imgDetails);
    if (imgDetails) {
      Target.innerText = "Static:";
      var typewriter = new Typewriter(Target, {
        loop: false,
        delay: 75,
      });
      typewriter.typeString(imgDetails).pauseFor(300).start();
    }
  }

  // GQ API Call : Get Image Details
  async function getImageDetails(ImageId) {
    const query = `query FindImage($id: ID!) {findImage(id: $id) {id details}}`;
    const filter = {
      id: ImageId,
    };
    return await csLib
      .callGQL({ query, variables: filter })
      .then((data) => data.findImage.details);
  }

  SetupLightBox();

})();
