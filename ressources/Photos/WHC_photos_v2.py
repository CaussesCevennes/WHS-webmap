# coding: utf-8
import sys, os
if sys.version_info[0] < 3:
    raise Exception("This program must run through Python 3")

import threading, queue

import logging
logging.basicConfig(level=logging.getLevelName('INFO'))

import csv, json
import io

#deps
import requests
from PIL import Image


class WHC_Photos():

    #blacklisted documents : csv in the form documentID;reason
    blacklistFile = os.path.dirname(__file__) + os.sep + 'blacklist.csv'

    minRes = 1000 #minimum resolution that will be considered as a "good resolution", influence the resulting score
    maxRes = 2500 #maximum resolution, downloaded photos that exceed this value in width or height will be resized

    jpgCompression = 85

    #fields names map (NOT USED FOR NOW)
    dataModel = {
        'site' : 'site', #world heritage site ID number
        'id' : 'id', #photo document unique ID number
        'url' : 'url', #url of the photo in the form https://whc.unesco.org/document/{PHOTO_ID}
        'thumb' : 'thumb', #url of the preview
        'title' : 'description', #title of the document
        'owidth' : 'owidth', #width of the original photo in pixels
        'oheight' : 'oheight', #height of the original photo in pixels
        'width' : 'width', #width of the resulting downloaded photo in pixels
        'height' : 'height', #height of the resulting downloaded photo in pixels
        'year' : 'year', #year of the photo
        'author' : 'author', #name of the author
        'copyright' : 'copyright', #the copyright mention preceed by © character
        'license' : 'license_en', #the licence name in english ['Creative Commons', 'Nomination File', 'All Rights Reserved']
        'conditions' : 'conditions_en' #reuse conditions (attribution, sharealike, noderivative...) in english
        }

    def getData(row, k):
        return row[dataModel[k]]

    def __init__(self, datafile, outFolder):
        '''
        Parse the photo database stored in a csv file, into a new dictionnary and sort photo by score
        > datafile : path of the csv file
        > outFolder : destination folder for downloaded images
        '''

        self.outFolder = outFolder

        #parse the blacklist
        if not os.path.exists(self.blacklistFile):
            with open(self.blacklistFile, 'w'): pass #create the file on disk
        with open(self.blacklistFile, 'r') as f:
            blacklist = [line.split(';')[0] for line in f.read().splitlines()]

        #parse the database
        self.datafile = datafile
        self.nPhotos = 0
        self.nDownloaded = 0
        with open(datafile, 'r', newline='', encoding="utf8") as f:
            reader = csv.DictReader(f, delimiter=';')
            self.photos = {}
            for row in reader:

                if row['id'] in blacklist:
                    continue
                if not row['owidth'] or not row['oheight']:
                    #seems missing data about original resolution is related to a 404 error or a non image content type
                    continue

                self.nPhotos += 1

                if os.path.exists(self._getPath(row)):
                    row['downloaded'] = 1
                    self.nDownloaded += 1
                else:
                    row['downloaded'] = 0

                idSite = row['site']
                if idSite in self.photos:
                    self.photos[idSite].append(row)
                else:
                    self.photos[idSite] = [row]

        logging.info('{}/{} photos available on disk'.format(self.nDownloaded, self.nPhotos))

    def getFields(self):
        return list(next(iter(self.photos.values()))[0].keys())

    def _getPath(self, row):
        '''return the destination path of an image'''
        return self.outFolder + os.sep + self._getName(row)

    def _getName(self, row):
        '''return the destination file name of an image'''
        return '_'.join( [str(row['site']).zfill(4), str(row['id'])] ) + '.jpg'

    def filterLicense(self):
        '''Remove from the database photos that don't have a permissive licence'''
        for site in self.photos:
            photos = self.photos[site]
            for i in reversed(range(len(photos))):
                if not self._hasPermissiveLicense(photos[i]):
                    photos.pop(i)

    def filterLowRes(self):
        '''Remove from the database photos that don't have a good resolution'''
        for site in self.photos:
            photos = self.photos[site]
            for i in reversed(range(len(photos))):
                if not self._hasGoodResolution(photos[i]):
                    photos.pop(i)

    def purge(self):
        '''Remove from the database undownloaded photos'''
        for site in self.photos:
            photos = self.photos[site]
            for i in reversed(range(len(photos))):
                if not os.path.exists(self._getPath(photos[i])):
                    photos.pop(i)

    def synchronize(self, purge=False):
        '''read and update effective photo size and remove non downloaded photo from the database'''
        logging.info('Synchronizing database...')
        cpt = 0
        for site in self.photos:
            photos = self.photos[site]
            for i in reversed(range(len(photos))):
                cpt += 1
                photo = photos[i]
                #logging.info('[{}/{}] Site {} photo {}'.format(cpt, self.nPhotos, photo['site'], photo['id']))
                path = self._getPath(photo)
                if os.path.exists(path):
                    photo['downloaded'] = 1
                    img = Image.open(path)
                    photo['width'], photo['height'] = img.size
                    #add extra data
                    if self._hasPermissiveLicense(photo):
                        photo['permissive'] = 1
                    else:
                        photo['permissive'] = 0
                    if self._isNotAvailableAtFullRes(photo, img):
                        photo['noOriginal'] = 1
                    else:
                        photo['noOriginal'] = 0
                    if self._hasGoodResolution(photo):
                        photo['hd'] = 1
                    else:
                        photo['hd'] = 0
                    photo['score'] = self._getScore(photo)
                elif purge:
                    photos.pop(i)
                else:
                    photo['downloaded'] = 0

    def sort(self):
        '''Sort synchronized data using a computing score for each photo'''
        for site in self.photos:
            self.photos[site].sort(key=self._getScore, reverse=True)

    def _hasPermissiveLicense(self, row):
        if row['license'].startswith('Creative Commons') or row['license'].startswith('Nomination File'):
            return True
        if row['copyright'] == '© UNESCO':
            return True
        if row['license'] == 'All Rights Reserved' or not row['license']:
            return False

    def _hasEvaluatedSize(self, row):
        return row.get('width', '') and row.get('height', '')

    def _isNotAvailableAtFullRes(self, photo, img):
        ow, oh = int(photo['owidth']), int(photo['oheight'])
        if max([ow, oh]) > self.maxRes:
            if max(img.size) != self.maxRes:
                return True
            else:
                return False
        elif (ow, oh) != img.size:
            return True
        else:
            return False

    def _hasGoodResolution(self, row):
        if not self._hasEvaluatedSize(row):
            raise Exception('Cannot evaluate resolution quality of non downloaded data, please synchronize and purge first')
        w, h = row['width'], row['height']
        if max( map(int, [w, h]) ) >= self.minRes:
            return True
        else:
            return False

    def _getScore(self, row):
        '''
        This score can be used to sort the photos of a site from the most usable to the worst usable
        It depends on 2 criterias : license (permissive is better) and resolution (highest is better)
        '''
        if self._hasPermissiveLicense(row) and self._hasGoodResolution(row):
            return 1
        if self._hasGoodResolution(row) and not self._hasPermissiveLicense(row):
            return 0.6
        if self._hasPermissiveLicense(row) and not self._hasGoodResolution(row):
            return 0.5
        if not self._hasPermissiveLicense(row) and not self._hasGoodResolution(row):
            return 0

    def export2csv(self, output, limit=1000, fields=None):
        logging.info('Writing datafile...')
        if fields is None:
            fields = self.getFields()
        with open(output, 'w', newline='', encoding="utf8") as f:
            writer = csv.DictWriter(f, fieldnames=fields, delimiter=';')
            writer.writeheader()
            for site in self.photos:
                #filter unselected fields and apply limit
                data = [{k:v for k,v in photo.items() if k in fields} for photo in self.photos[site][:limit]]
                writer.writerows(data)

    def export2json(self, output, pretty=False, limit=1000, fields=None):
        logging.info('Writing json...')
        if fields is None:
            fields = self.getFields()
        with open(output, 'w', encoding="utf8") as f:
            #create a new dict to filter unselected fields and apply limit
            data = {}
            for site in self.photos:
                data[site] = [{k:v for k,v in photo.items() if k in fields} for photo in self.photos[site][:limit]]
            #write
            if pretty:
                f.write(json.dumps(data, indent=4))
            else:
                f.write(json.dumps(data))

    def download(self, siteId=None, limit=50, nbThreads=4):
        #Seed the queue
        self.jobs = queue.Queue()
        for site in self.photos:
            if siteId is not None and siteId != site:
                continue
            for photo in self.photos[site][:limit]:
                if not os.path.exists(self._getPath(photo)):
                    self.jobs.put(photo)
        self.nJobs = self.jobs.qsize()
        self.cptJobs = 0
        #start threads
        threads = []
        for i in range(nbThreads):
            t = threading.Thread(target=self._downloader)
            t.setDaemon(True)
            threads.append(t)
            t.start()
        for t in threads:
            t.join()


    def _downloader(self):
        while not self.jobs.empty(): #empty is True if all item was get but it not tell if all task was done
            row = self.jobs.get()
            with threading.RLock():
                self.cptJobs += 1
                logging.info('[{}/{}] Site {} downloading {}'.format(self.cptJobs, self.nJobs, row['site'], row['url']))

            path = self.outFolder + os.sep + self._getName(row)
            r = requests.get(row['url'])
            if r.status_code == 200:
                '''
                with open(path, 'wb') as f:
                    f.write(r.content)
                '''
                #Open the stream with PIL, resize if needed and write the jpg on disk
                try:
                    img = Image.open(io.BytesIO(r.content))
                except Exception as e:
                    logging.error(' >> [{}] Cannot open url stream : '.format(row['id']), exc_info=True)
                    with open(self.blacklistFile, 'a') as blacklist:
                        blacklist.write(row['id'] + ';' + 'Corrupted' + '\n')
                else:
                    #Nota : an image can be unavailable in its original resolution, in this case a smaller image is returned
                    if self._hasWrongSize(row, img):
                        logging.warning('[{}] >> The downloaded image resolution does not match the expected size'.format(row['id']))
                    img = self._resize(img)
                    img.save(path, quality=self.jpgCompression, progressive=True, optimize=True)
            elif r.status_code == 404:
                with threading.RLock():
                    logging.warning('[{}] >> 404 error, adding to blacklist'.format(row['id']))
                    with open(self.blacklistFile, 'a') as blacklist:
                        blacklist.write(row['id'] + ';' + '404' + '\n')
            else:
                logging.error(' >> [{}] Request failed with code {}'.format(row['id'], r.status_code))

            self.jobs.task_done() #it's just a count of finished tasks used by join() to know if the work is finished

    def _hasWrongSize(self, photo, img):
        '''check if the size of the downloaded image image match the expected size'''
        w, h = img.size
        ow, oh = int(photo['owidth']), int(photo['oheight'])
        if w != ow or h != oh:
            return True
        else:
            return False

    def _isTooLarge(self, img):
        '''check if the size exceed the maximum accepted resolution'''
        return max(img.size) > self.maxRes

    def _resize(self, img):
        '''
        Reduce if needed the resolution of the image under the maximum accepted resolution,
        or return the image as it if it's not needed.
        input : PIL Image, output : PIL Image
        '''
        if self._isTooLarge(img):
            w, h = img.size
            if w >= h:
                w2 = self.maxRes
                h2 = int(self.maxRes * h / w)
            else:
                h2 = self.maxRes
                w2 = int(self.maxRes * w / h)
            logging.info(' >> Redim. from {} to {}'.format(img.size, (w2, h2)))
            return img.resize((w2, h2), Image.ANTIALIAS)
        else:
            return img

    def resizeDownloadedPhotos(self, folder):
        '''browse already downloaded images files and resize them if they exceed the maximum resolution'''
        for f in os.path.listdir(folder):
            if f.endswith('.jpg'):
                img = Image.open(folder + os.sep + f)
                if _isTooLarge(img):
                    img = self._resize(img)
                    img.save(path, quality=self.jpgCompression, progressive=True, optimize=True)





if __name__ == '__main__':
    folder = os.path.dirname(__file__)

    #INIT
    input = folder + os.sep + 'whc_photos.csv'
    outFolder = '/mnt/DATA/whc/photos'
    photos = WHC_Photos(input, outFolder)

    #Download
    photos.download(limit=200, nbThreads=4)

    #CSV export
    photos.synchronize()
    output = folder + os.sep + 'whc_photos_sync.csv'
    photos.export2csv(output)

    #JSON export
    photos.purge()
    photos.sort()
    output = folder + os.sep + 'photos.json'
    photos.export2json(output, fields=['id', 'copyright', 'license', 'thumb'], limit=50)
