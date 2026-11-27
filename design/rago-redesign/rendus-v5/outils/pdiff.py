# python3 pdiff.py <app.png> <maquette.png> [x0 y0 x1 y1] : bandes de lignes qui diffèrent (seuil 40)
import sys
from PIL import Image, ImageChops
import numpy as np
A=Image.open(sys.argv[1]).convert('L'); M=Image.open(sys.argv[2]).convert('L')
box=tuple(map(int,sys.argv[3:7])) if len(sys.argv)>6 else (0,0,min(A.size[0],M.size[0]),min(A.size[1],M.size[1]))
A=A.crop(box); M=M.crop(box)
arr=np.array(ImageChops.difference(A,M).point(lambda v:255 if v>40 else 0))
r=np.where(arr.sum(1)>255*3)[0]; bands=[]
for y in r:
    if bands and y-bands[-1][1]<=3: bands[-1][1]=y
    else: bands.append([y,y])
print(int((arr>0).sum()),'px', [(int(b0)+box[1],int(b1)+box[1], box[0]+int(np.where(arr[b0:b1+1].sum(0)>0)[0].min()), box[0]+int(np.where(arr[b0:b1+1].sum(0)>0)[0].max())) for b0,b1 in bands][:30])
