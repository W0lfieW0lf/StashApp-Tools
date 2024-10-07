# LightBox Visual Novel

This Script runs when opening images in Lightbox.it will check for image details in stash and displays the text with type writter effect similar to visual novel.
if there is no details it will skip the animation and display the default image title.

## Configuration



## Dependencies

The script requires the following javascript libraries:
- typewriter-effect

## How It Works
- The script get the image ID from Light box carosal.
- It queries the GraphQL API to get the details field of the image.
- Replace the title with Details and call they typewriter function.
- If ther is no details found.it will display the title of the image.

## Usage

Add the LightBox-VisualNovel in the Plugin folder and enable it.
