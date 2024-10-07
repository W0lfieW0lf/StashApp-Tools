// ==UserScript==
// @name        Stash-TMDB Sync/Scraper
// @namespace   https://github.com/WolfieWolff/Stash-App-Tools
// @match       https://www.themoviedb.org/*
// @grant       none
// @version     1.0
// @author      MSB
// @description Sync Button in TMDB Site.to Create Movie/Performer in Stash and Update performer missing info.
// @grant GM_setValue
// @grant GM_getValue
// @grant GM.setValue
// @grant GM.getValue
// @grant GM_setClipboard
// @grant unsafeWindow
// @grant GM.xmlHttpRequest
// ==/UserScript==
(function()
{
    'use strict';
    // Server and API key configuration
    const config = {
        serverUrl: 'http://localhost:9999/graphql',
        apiKey: '' // Add your API key here
    };

  //If the country is in TMDB but not added to Stash performer.Get the country from TMDB and Contry Code from Stash and mapit.
  
  // 'TMDB Country name' : 'Stash Country Code'
     const CountryCode_Map=
           {
             'China':'CN',
             'India':'IN',
             'Philippines':'PH',
             'South Korea':'KR',
             'USA':'US'
      };

    let target = document.querySelector('.title');

    function setupElementObserver()
    {
        waitForElement(target, (element) =>
        {
            // Check if an icon is already added to prevent duplicates
            if (element.querySelector('.resolution-icon'))
            {
                return;
            }
        });
    }

    function createTooltipElement()
    {
        const copyTooltip = document.createElement('span');
        copyTooltip.setAttribute('id', 'copy-tooltip');
        copyTooltip.innerText = 'Copied!';
        copyTooltip.classList.add('fade', 'hide');
        copyTooltip.style.position = "absolute";
        copyTooltip.style.left = '0px';
        copyTooltip.style.top = '0px';
        copyTooltip.style.marginLeft = '40px';
        copyTooltip.style.padding = '5px 12px';
        copyTooltip.style.backgroundColor = '#000000df';
        copyTooltip.style.borderRadius = '4px';
        copyTooltip.style.color = '#fff';
        document.body.appendChild(copyTooltip);
        return copyTooltip;
    }

    function createCopyButton()
    {
        const copyBtn = document.createElement('button');
        copyBtn.setAttribute('id', 'copy-stashid');
        copyBtn.title = 'Copy to clipboard';
        copyBtn.innerHTML = 'Copy Url';
        copyBtn.classList.add('btn', 'btn-secondary', 'btn-sm', 'minimal', 'ml-1');
        copyBtn.addEventListener('click', evt =>
        {
            let copypath = window.location.href;
            console.log(copypath);
            GM_setClipboard(copypath);
            const copyTooltip = createTooltipElement();
            const rect = document.body.getBoundingClientRect();
            const rect2 = evt.currentTarget.getBoundingClientRect();
            const x = rect2.left - rect.left;
            const y = rect2.top - rect.top;
            copyTooltip.classList.add('show');
            copyTooltip.style.left = `${x}px`;
            copyTooltip.style.top = `${y}px`;
            setTimeout(() =>
            {
                copyTooltip.remove();
            }, 500);
        });
        return copyBtn;
    }

    function createPerformerSyncButton(ButtonId, ButtonTitle, button_data)
    {
        const copyBtn = document.createElement('button');
        copyBtn.setAttribute('id', ButtonId);
        copyBtn.setAttribute('data-mydata', button_data);
        copyBtn.title = ButtonTitle;
        copyBtn.innerText = ButtonTitle;
        copyBtn.classList.add('btn', 'btn-secondary', 'btn-sm', 'minimal', 'ml-1');
        copyBtn.addEventListener('click', evt =>
        {
            var mydatajson = JSON.parse(evt.target.dataset.mydata);
            console.log("Stash Input data", mydatajson);
            const res = UpdateStashPerformer(mydatajson);
            console.log("updated", res);
        });
        return copyBtn;
    }

    function createGroupSyncButton(ButtonId, ButtonTitle, button_data)
    {
        const copyBtn = document.createElement('button');
        copyBtn.setAttribute('id', ButtonId);
        copyBtn.setAttribute('data-mydata', button_data);
        copyBtn.title = ButtonTitle;
        copyBtn.innerText = ButtonTitle;
        copyBtn.classList.add('btn', 'btn-secondary', 'btn-sm', 'minimal', 'ml-1');
        copyBtn.addEventListener('click', evt =>
        {
            var mydatajson = JSON.parse(evt.target.dataset.mydata);
            console.log("Stash Input data", mydatajson);
            const res = UpdateStashGroup(mydatajson);
            console.log("updated", res);
        });
        return copyBtn;
    }
    // Initial call to handle elements on the current page
    setupElementObserver();
    // Modified waitForElement function
    function waitForElement(selector, callback)
    {
        console.log("selector", selector);
        if (!document.getElementById('copy-stashid'))
        {
            var profiletitle = selector.querySelectorAll('h2')[0].innerText;
            console.log("profiletitle", profiletitle);
            selector.insertBefore(createCopyButton(), selector.firstChild);
            if (window.location.href.indexOf("person") > -1)
            {
                //let performercheck = SearchPerformerinStash(profiletitle, selector);
                let performercheck = PerformerSync(profiletitle, selector);
            }
            else
            {
                var grouptitle = ""
                if (profiletitle.split('(')[0])
                {
                    grouptitle = profiletitle.split('(')[0].trim();
                }
                else
                {
                    grouptitle = profiletitle
                }
                let groupcheck = GroupSync(grouptitle, selector);
            }
        }
        const observer = new MutationObserver((mutations) =>
        {
            console.log("mutations", mutations);
            mutations.forEach((mutation) =>
            {
                console.log("mutation", mutation);
                if (mutation.type === 'childList')
                {
                    let target_values = [].slice.call(target.children).map(function(node)
                    {
                        return node.innerHTML
                    }).filter(function(s)
                    {
                        // When user has hit ENTER, then this
                        // condition is going to hold true
                        if (s === '<h2>') return false;
                        return true;
                    });
                    // Logging the updated target list
                    // stored inside target_values
                    console.log(target_values);
                }
            });
        });
        observer.observe(target,
        {
            childList: true
        });
        // Function to stop observing
        function stopObserving()
        {
            observer.disconnect();
        }
        return stopObserving;
    }
    async function getPerformerInfoFromMovieDB()
    {
        var TMDB_PerformerData = {};
        var urls = [];
        urls.push(window.location.href);
        console.log('getPerformerInfoFromMovieDB');
        const PerformerImage = document.getElementById('original_header').querySelectorAll('img')[0].src;
        const PerformerSocialLinks = document.getElementsByClassName('social_links')[0];
        const Performerfacts = document.getElementsByClassName('facts')[1];
        if (PerformerImage)
        {
            TMDB_PerformerData.image = PerformerImage;
        }
        if (PerformerSocialLinks)
        {
            const Links = PerformerSocialLinks.querySelectorAll('a');
            for (let i = 0; i < Links.length; i++)
            {
                if (Links[i].src)
                {
                    urls.push(Links[i].href);
                }
            }
        }
        TMDB_PerformerData.urls = urls;
        if (Performerfacts)
        {
            const Performerdetails = Performerfacts.querySelectorAll('p');
            var k1 = "";
            var v1 = "";
            for (let i = 0; i < Performerdetails.length; i++)
            {
                console.log('%d,%s', i, Performerdetails[i].innerText);
                k1 = Performerdetails[i].innerText.split(/\r?\n/)[0];
                v1 = Performerdetails[i].innerText.split(/\r?\n/)[1];
                if (k1 && v1 && v1 != '-')
                {
                    console.log("%s:%s", k1, v1);
                    if (k1 == 'Gender')
                    {
                        TMDB_PerformerData.gender = v1.toUpperCase();
                    }
                    else if (k1 == 'Birthday')
                    {
                        TMDB_PerformerData.birthdate = formatDate(v1);
                    }
                    else if (k1 == 'Place of Birth')
                    {
                        var contrycode = GetCountryCode(v1);
                      console.log("contrycode",contrycode);
                        if (contrycode.length > 0)
                        {
                            TMDB_PerformerData.country = contrycode;
                        }
                    }
                }
                k1 = ""
                v1 = ""
            }
        }
        return TMDB_PerformerData;
    }

    function formatDate(dtstr)
    {
        var newdt = "";
        if (dtstr.split('(')[0])
        {
            newdt = dtstr.split('(')[0]
        }
        else
        {
            newdt = dtstr
        }
        var d = new Date(newdt),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    }

    function GetCountryCode(selectedCountry)
    {
        var ccode = "";
        var country = "";
        if (selectedCountry.split(/[\s,]+/).pop())
        {
            country = selectedCountry.split(/[\s,]+/).pop();
        }
        else
        {
            country = selectedCountry;
        }
        console.log("parse country", selectedCountry);

      if(CountryCode_Map[country])
        {
          ccode=CountryCode_Map[country];


        }
        else
        {
            console.log("Stash-TMDB:No country code for %s",country);
        }

        return ccode;
    }
    async function getGroupInfoFromMovieDB(Searchstr)
    {
        console.log('getGroupInfoFromMovieDB');
        var TMDB_GroupData = {};
        var urls = [];
        urls.push(window.location.href);
        TMDB_GroupData.name = Searchstr;
        TMDB_GroupData.urls = urls;
        const GroupHeader = document.getElementById('original_header');
        const GroupImage = GroupHeader.querySelectorAll('img')[0].src;
        console.log("GroupImage", GroupImage);
        if (GroupImage)
        {
            TMDB_GroupData.front_image = GroupImage;
        }
        const header_info = document.getElementsByClassName('header_info')[0];
        const Groupsynopsys = header_info.querySelectorAll('p')[0].innerText;
        if (Groupsynopsys)
        {
            TMDB_GroupData.synopsis = Groupsynopsys;
        }
        const release = GroupHeader.querySelectorAll('.release')[0].innerText;
        if (release)
        {
            console.log("release", formatDate(release));
            TMDB_GroupData.date = formatDate(release);
        }
        console.log("TMDB_GroupData", TMDB_GroupData);
        return TMDB_GroupData;
    }
    async function getGroupInfoFromStashDB(Searchstr)
    {
        const queryText = `
query FindGroups($filter: FindFilterType) {
  findGroups(filter: $filter) {
    count
    groups {
      id
      name
    }
  }
}
        `;
        const query = {
            q: Searchstr
        };
        console.log("query", query);
        const response = await fetch(config.serverUrl,
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${config.apiKey}`
            },
            body: JSON.stringify(
            {
                query: queryText,
                variables:
                {
                    filter: query
                }
            })
        });
        const result = await response.json();
        console.log("result", result);
        return result.data.findGroups;
    }
    async function getPerformerInfoFromStashDB(Searchstr)
    {
        const queryText = `
query FindPerformers(
  $filter: FindFilterType

) {
  findPerformers(
    filter: $filter

  ) {
    count
    performers {
      id
      name
      gender
      birthdate
      urls
      image_path
      country
    }
  }
}
        `;
        const query = {
            q: Searchstr
        };
        console.log("query", query);
        const response = await fetch(config.serverUrl,
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${config.apiKey}`
            },
            body: JSON.stringify(
            {
                query: queryText,
                variables:
                {
                    filter: query
                }
            })
        });
        const result = await response.json();
        console.log("result", result);
        return result.data.findPerformers;
    }
    async function getPerformerMissingInfo(stash_data, tmdb_data)
    {
        var missinginfo = {};
        var keys = Object.keys(stash_data);
        keys.forEach(key =>
        {
            if (key == "id")
            {
                missinginfo[key] = stash_data[key];
            }
            else
            {
                if (tmdb_data.hasOwnProperty(key))
                {
                    //key exist.compare
                    if (key == 'urls')
                    {
                        //handle array
                        var stashArray = stash_data[key];
                        var tmdbArray = tmdb_data[key];
                        const updatedArray2 = tmdbArray.filter(item => !stashArray.includes(item));
                        if (updatedArray2.length > 0)
                        {
                            missinginfo[key] = updatedArray2;
                        }
                    }
                    else if (key == 'image')
                    {
                        //check profile img
                        const imagepath = stash_data[key];
                        const qparams = (new URL(imagepath)).searchParams;
                        if (qparams.has("default"))
                        {
                            missinginfo[key] = tmdb_data[key];
                        }
                    }
                    else
                    {
                        //not same value use it from
                        if (stash_data[key] != tmdb_data[key])
                        {
                            missinginfo[key] = tmdb_data[key];
                        }
                    }
                }
            }
        });
        return missinginfo
    }
    async function GroupSync(Searchstr, Targetelement)
    {
        const tmdb_data = await getGroupInfoFromMovieDB(Searchstr);
        const stash_data = await getGroupInfoFromStashDB(Searchstr);
        const groupcount = stash_data.count;
        const GrpSyncEleID = "Group-Sync";
        var action = "";
        var groupdata;
        if (groupcount == 0)
        {

            action = "Create";
            groupdata = tmdb_data;
        }
        if (action != "")
        {
            var my_data_str = JSON.stringify(groupdata, (key, value) =>
            {
                if (!isNaN(value)) value = Number(value);
                return value
            });
            if (!document.getElementById(GrpSyncEleID))
            {
                Targetelement.insertBefore(createGroupSyncButton(GrpSyncEleID, action, my_data_str), Targetelement.firstChild);
            }
        }
    }
    async function PerformerSync(Searchstr, Targetelement)
    {
        const tmdb_data = await getPerformerInfoFromMovieDB();
        const stash_data = await getPerformerInfoFromStashDB(Searchstr);
        const performerscount = stash_data.count;
        var action = "";
        var performerdata;
        if (performerscount == 1)
        {

            const missing_info = await getPerformerMissingInfo(stash_data.performers[0], tmdb_data);

            if (Object.keys(missing_info).length > 1)
            {

                action = "Update";
                performerdata = missing_info;
            }
            else
            {
                console.log('Performer Update NotRequired');
            }
        }
        else if (performerscount == 0)
        {

            tmdb_data.name = Searchstr;
            action = "Create";
            performerdata = tmdb_data;
        }
        else
        {
            console.log('Multiple found');
        }
        const SyncEleID = "Performer-Sync";
        if (action != "")
        {
            var my_data_str = JSON.stringify(performerdata, (key, value) =>
            {
                if (!isNaN(value)) value = Number(value);
                return value
            });
            if (!document.getElementById(SyncEleID))
            {
                Targetelement.insertBefore(createPerformerSyncButton(SyncEleID, action, my_data_str), Targetelement.firstChild);
            }
        }
    }
    async function UpdateStashGroup(mutationdata)
    {
        const mutation = `
mutation GroupCreate($input: GroupCreateInput!) {
  groupCreate(input: $input) {
    id
  }
}
		`;
        const mutationInput = {
            input: mutationdata
        };
        console.log("mutationInput", mutationInput);
        const response = await fetch(config.serverUrl,
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${config.apiKey}`
            },
            body: JSON.stringify(
            {
                query: mutation,
                variables: mutationInput
            })
        });
        try
        {
            const result = await response.json();
            console.log("Response for updating Group:", result);
            if (result && result.data)
            {
                const resStatus = result.data;
                const ubutton = document.getElementById('Group-Sync');
                ubutton.remove();
                return result.data.groupCreate.id;
            }
            else
            {
                console.error('Failed to update Group:');
                return null;
            }
        }
        catch (error)
        {
            console.error('Error updating Group:', error);
            return null;
        }
    }
    async function UpdateStashPerformer(mutationdata)
    {
        var mutation;
        const mutation_update = `
mutation PerformerUpdate($input:PerformerUpdateInput!) {
  performerUpdate(input: $input) {
    id
  }
}
		`;
        const mutation_create = `
mutation PerformerCreate($input:PerformerCreateInput!) {
  performerCreate(input: $input) {
    id
  }
}
		`;
        const mutationInput = {
            input: mutationdata
        };
        if (mutationdata.hasOwnProperty('id'))
        {
            mutation = mutation_update;
        }
        else
        {
            mutation = mutation_create;
        }

        const response = await fetch(config.serverUrl,
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${config.apiKey}`
            },
            body: JSON.stringify(
            {
                query: mutation,
                variables: mutationInput
            })
        });
        try
        {
            const result = await response.json();

            if (result && result.data)
            {
                const resStatus = result.data;
                const ubutton = document.getElementById('Performer-Sync');
                ubutton.remove();
                if (resStatus.hasOwnProperty('performerCreate'))
                {
                    return result.data.performerCreate.id;
                }
                else
                {
                    return result.data.performerUpdate.id;
                }
            }
            else
            {
                console.error('Failed to update performer:');
                return null;
            }
        }
        catch (error)
        {
            console.error('Error updating performer:', error);
            return null;
        }
    }
})();