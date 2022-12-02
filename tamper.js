// ==UserScript==
// @name         Facebook Sponsored posts remover
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Facebook Sponsored posts remover
// @author       wisniewski.bart@gmail.com
// @match        https://www.facebook.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// ==/UserScript==

class SponsoredPostRemover {
  sponsoredPostsRemoved = -1;

  debugCounterElement = document.createElement('span');

  debugRemovedTitles = document.createElement('div');

  debugRemovedTitlesList = document.createElement('ul');

  titlesOfRemovedPosts = [];

  postsContainer;

  debugCounterElementUpdate() {
    this.sponsoredPostsRemoved += 1;
    this.debugCounterElement.innerText = this.sponsoredPostsRemoved.toString();
    this.debugRemovedTitlesList.innerText = '';
    this.titlesOfRemovedPosts.forEach((title) => {
      const li = document.createElement('li');
      li.innerText = title;
      this.debugRemovedTitlesList.appendChild(li);
    });
  }

  createDebugContainer() {
    const stylesObject = {
      '.debugContainer': {
        fontSize: '15px',
        position: 'fixed',
        top: '100%',
        marginTop: '-50px',
        color: 'var(--primary-text)',
        left: '16px',
      },
      '.debugCounter': {
        color: 'var(--accent)',
        fontWeight: 'bold',
        position: 'relative',
      },
      '.debugRemovedTitles': {
        position: 'absolute',
        bottom: '100%',
        display: 'block',
        width: '20vw',
        maxWidth: '200px',
        left: '0',
        maxHeight: '200px',
        height: 'auto',
        backgroundColor: 'var(--card-background)',
        padding: '16px',
        borderRadius: 'var(--card-corner-radius)',
      },
      '.debugRemovedTitlesList': {
        maxHeight: '200px',
        height: 'auto',
        display: 'block',
        overflowY: 'auto',
      },
      '.debugContainer .debugRemovedTitles': {
        opacity: '0',
        pointerEvents: 'none',
        transition: 'all 500ms linear 1s',
      },
      '.debugContainer:hover .debugRemovedTitles': {
        opacity: '1',
        pointerEvents: 'auto',
        transition: 'all 200ms linear',
      },
      '.debugRemovedTitlesList::before': {
        content: '"List of removed posts:"',
        fontWeight: 'bold',
        position: 'absolute',
        left: '0',
        top: '-24px',
      },
    };

    let styleString = '';
    Object.entries(stylesObject).forEach(([identifier, styles]) => {
      styleString += `${identifier} {\n`;
      Object.entries(styles).forEach(([styleName, styleValue]) => {
        styleString += `\t${styleName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}: ${styleValue}; \n`;
      });

      styleString += '}\n';
    });

    styleString += '';

    const style = document.createElement('style');

    if (style.styleSheet) {
      style.styleSheet.cssText = styleString;
    } else {
      style.appendChild(document.createTextNode(styleString));
    }

    document.getElementsByTagName('head')[0].appendChild(style);

    const debugContainer = document.createElement('div');

    debugContainer.innerText = 'Sponsored posts removed: ';
    debugContainer.id = 'debugContainer';
    debugContainer.classList.add('debugContainer');
    this.debugCounterElement.id = 'debugCounter';
    this.debugCounterElement.classList.add('debugCounter');
    this.debugCounterElement.innerText = '.';
    this.debugRemovedTitles.id = 'debugRemovedTitles';
    this.debugRemovedTitles.classList.add('debugRemovedTitles');
    this.debugRemovedTitlesList.id = 'debugRemovedTitlesList';
    this.debugRemovedTitlesList.classList.add('debugRemovedTitlesList');

    this.debugRemovedTitles.appendChild(this.debugRemovedTitlesList);
    debugContainer.appendChild(this.debugRemovedTitles);
    debugContainer.appendChild(this.debugCounterElement);
    document.body.appendChild(debugContainer);

    this.debugCounterElementUpdate();
  }

  postContainerObserverCallback(mutationList) {
    for (const mutation of mutationList) {
      // only proceed if any posts have been added
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0 && mutation.addedNodes[0].childNodes.length > 0) {
        const directChildren = Array.from(mutation.target.querySelectorAll(':scope > div:not(.processed)')); // *1
        if (!directChildren.length) {
          return;
        }
        /**
        * check if:
        * 1. post has <use> tags
        * 2. any of these <use> tags links to <text> element with "Sponsored" text content
        *
        */
        directChildren.forEach((child) => {
          let isSponsored = false;
          const postTitle = child.getElementsByTagName('h4')[0]?.textContent.trim();
          child.classList.add('processed'); // make sure this child will be omitted during the next loop iteration. See *1
          const useNodes = Array.from(child.getElementsByTagName('use'));
          if (!useNodes.length) { // 1.
            return;
          }

          useNodes.forEach((useNode) => {
            const useHref = useNode.getAttributeNS('http://www.w3.org/1999/xlink', 'href').substring(1);
            const actualText = document.getElementById(useHref).textContent;
            if (actualText === 'Sponsored') { // 2.
              isSponsored = true;
            }
          });

          if (isSponsored) {
            console.log('[debugger]:', postTitle, 'is sponsored! removing...');
            if (postTitle) {
              this.titlesOfRemovedPosts.push(postTitle);
            }

            // hiding sponsored post, as removing it results in fb scripts going bananas
            child.style.display = 'none';
            // child.remove();
            this.debugCounterElementUpdate();
          }
        });
      }
    }
  }

  getPostsContainer() {
    const xpath = "//h3[text()='News Feed posts']/following-sibling::div";
    this.postsContainer = document.evaluate(
      xpath, document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
    console.log('[debugger]: adding observer to', this.postsContainer);
  }

  initObserver() {
    if (!this.postsContainer) {
      return;
    }

    const observer = new MutationObserver((mutationList) => {
      this.postContainerObserverCallback(mutationList);
    });

    observer.observe(this.postsContainer, { attributes: true, childList: true, subtree: false });
  }

  constructor() {
    this.getPostsContainer();
    if (!this.postsContainer) {
      return;
    }
    this.createDebugContainer();
    this.initObserver();
  }
}

// wait for page load...
if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
  const sponsoredPostRemover = new SponsoredPostRemover();
  sponsoredPostRemover();
}
