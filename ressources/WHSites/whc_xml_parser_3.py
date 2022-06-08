import os
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
import pandas

cdir = os.path.dirname(os.path.abspath(__file__))

def prefixField(field, country):
    if field in ['site', 'justification', 'short_description', 'location', 'region', 'states']:
        return '_'.join([country, field])
    else:
        return field

def getCulturalLandscapes(url = "https://whc.unesco.org/fr/PaysagesCulturels/"):
    r = requests.get(url)
    soup = BeautifulSoup(r.text)

    data = []
    for country in soup.findAll("div", {"class" : "list_site"}):
        sites = country.findAll('li')
        for site in sites:
            link = site.find('a')
            offset = len('/fr/list/')
            idSite = link['href'][offset:]
            name = link.text
            #data.append( {'id_number':idSite, 'name':name} )
            data.append( {'id_number':idSite, 'cult_land':1} )

    #The parsing generate some duplicates due to transboundary sites that are listed for each of their countries
    #gp = df.groupby(['id_number'])['id_number'].count().reset_index(name="count")
    #print( gp[gp["count"]>1])
    return pandas.DataFrame(data).drop_duplicates(subset=['id_number'])

def parseXmlWorldHeritageList(urlTemplate='https://whc.unesco.org/{iso}/list/xml', isos=['en', 'fr', 'es']):
    dfs = []
    for iso in isos:
        url = urlTemplate.format(iso=iso)
        r = requests.get(url)

        root = ET.fromstring(r.content)

        fields = [prefixField(elem.tag, iso) for elem in root[0]]

        data = []
        for row in root:
            values = {prefixField(elem.tag, iso):elem.text for elem in row}
            #Get rid of html tags
            if values[iso + '_site']:
                values[iso + '_site'] = BeautifulSoup(values[iso + '_site']).get_text()
            if values[iso + '_short_description']:
                values[iso + '_short_description'] = BeautifulSoup(values[iso + '_short_description']).get_text()
            if values[iso + '_justification']:
                values[iso + '_justification'] = BeautifulSoup(values[iso + '_short_description']).get_text()

            data.append(values)

        df = pandas.DataFrame(data)
        #df.set_index('id_number')
        dfs.append(df)

    #df = pandas.DataFrame().join(dfs) #overlap columns names
    df =  dfs[0]
    for _df in dfs[1:]:
        cols = _df.columns.difference(df.columns).insert(-1, 'id_number')
        df = df.merge(_df[cols], how='inner', on = 'id_number')

    return df


if __name__ == '__main__':
    df1 = parseXmlWorldHeritageList()
    df2 = getCulturalLandscapes()

    df = df1.merge(df2, how='left', on = 'id_number')
    df.to_csv(os.path.join(cdir, 'output.csv'), ';')
